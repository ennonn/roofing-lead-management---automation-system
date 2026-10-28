ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "availability_status" varchar(30) DEFAULT 'available' NOT NULL,
  ADD COLUMN IF NOT EXISTS "notice_headline" varchar(150),
  ADD COLUMN IF NOT EXISTS "notice_body" text,
  ADD COLUMN IF NOT EXISTS "reopen_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "auto_resume" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "accept_quotes_when_unavailable" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "timezone" varchar(50) DEFAULT 'America/New_York' NOT NULL;
