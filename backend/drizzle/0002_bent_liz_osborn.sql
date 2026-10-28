ALTER TABLE "n8n_processed_events" ADD COLUMN "claim_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "n8n_processed_events" ADD COLUMN "lease_expires_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_n8n_processed_events_lease" ON "n8n_processed_events" USING btree ("status","lease_expires_at");