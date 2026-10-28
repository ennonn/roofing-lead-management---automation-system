-- PostgreSQL functions for atomic claim acquisition, concurrency locking, and pre-flight lease verification

CREATE OR REPLACE FUNCTION acquire_n8n_lead_claim(
  p_idempotency_key uuid,
  p_lead_id uuid,
  p_lease_interval interval DEFAULT interval '5 minutes'
)
RETURNS TABLE (
  idempotency_key uuid,
  lead_id uuid,
  status varchar,
  customer_notified boolean,
  staff_notified boolean,
  claim_version integer,
  claim_status varchar
) AS $$
#variable_conflict use_column
DECLARE
  v_row n8n_processed_events%ROWTYPE;
BEGIN
  -- 1. Attempt initial insert with default version 1 and lease
  INSERT INTO n8n_processed_events (
    idempotency_key, lead_id, event_type, status,
    customer_notified, staff_notified, claim_version,
    lease_expires_at, created_at, updated_at
  )
  VALUES (
    p_idempotency_key, p_lead_id, 'lead.created', 'processing',
    false, false, 1,
    now() + p_lease_interval, now(), now()
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING * INTO v_row;

  IF FOUND THEN
    RETURN QUERY SELECT
      v_row.idempotency_key,
      v_row.lead_id,
      v_row.status,
      v_row.customer_notified,
      v_row.staff_notified,
      v_row.claim_version,
      'CLAIM_ACQUIRED'::varchar;
    RETURN;
  END IF;

  -- 2. If row exists, lock it explicitly with FOR UPDATE
  -- Under READ COMMITTED, FOR UPDATE waits for any uncommitted concurrent transaction
  -- and re-evaluates the latest committed version of the row.
  SELECT * INTO v_row
  FROM n8n_processed_events
  WHERE n8n_processed_events.idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      p_idempotency_key,
      p_lead_id,
      'failed'::varchar,
      false,
      false,
      0,
      'AMBIGUOUS_RETRY'::varchar;
    RETURN;
  END IF;

  -- 3. Check if already completed
  IF v_row.status = 'completed' THEN
    RETURN QUERY SELECT
      v_row.idempotency_key,
      v_row.lead_id,
      v_row.status,
      v_row.customer_notified,
      v_row.staff_notified,
      v_row.claim_version,
      'ALREADY_COMPLETED'::varchar;
    RETURN;
  END IF;

  -- 4. Check if lease expired (crash recovery) or previously failed
  IF v_row.lease_expires_at <= now() OR v_row.status = 'failed' THEN
    UPDATE n8n_processed_events
    SET
      status = 'processing',
      claim_version = v_row.claim_version + 1,
      lease_expires_at = now() + p_lease_interval,
      updated_at = now()
    WHERE n8n_processed_events.idempotency_key = p_idempotency_key
    RETURNING * INTO v_row;

    RETURN QUERY SELECT
      v_row.idempotency_key,
      v_row.lead_id,
      v_row.status,
      v_row.customer_notified,
      v_row.staff_notified,
      v_row.claim_version,
      'CLAIM_ACQUIRED'::varchar;
    RETURN;
  END IF;

  -- 5. Otherwise active lease held by another processor
  RETURN QUERY SELECT
    v_row.idempotency_key,
    v_row.lead_id,
    v_row.status,
    v_row.customer_notified,
    v_row.staff_notified,
    v_row.claim_version,
    'CONCURRENT_LOCKED'::varchar;
  RETURN;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION verify_and_renew_n8n_claim(
  p_idempotency_key uuid,
  p_claim_version integer,
  p_lease_interval interval DEFAULT interval '5 minutes'
)
RETURNS TABLE (
  idempotency_key uuid,
  claim_version integer,
  is_valid boolean
) AS $$
#variable_conflict use_column
DECLARE
  v_row n8n_processed_events%ROWTYPE;
BEGIN
  UPDATE n8n_processed_events
  SET
    lease_expires_at = now() + p_lease_interval,
    updated_at = now()
  WHERE n8n_processed_events.idempotency_key = p_idempotency_key
    AND n8n_processed_events.claim_version = p_claim_version
    AND n8n_processed_events.status = 'processing'
    AND n8n_processed_events.lease_expires_at > now()
  RETURNING * INTO v_row;

  IF FOUND THEN
    RETURN QUERY SELECT v_row.idempotency_key, v_row.claim_version, true;
  ELSE
    RETURN QUERY SELECT p_idempotency_key, p_claim_version, false;
  END IF;
END;
$$ LANGUAGE plpgsql;
