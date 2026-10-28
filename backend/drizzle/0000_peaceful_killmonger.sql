CREATE TABLE "business_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(200) DEFAULT 'Roofing Company' NOT NULL,
	"phone" varchar(50) DEFAULT '' NOT NULL,
	"emergency_phone" varchar(50),
	"dispatch_email" varchar(255) DEFAULT '' NOT NULL,
	"address" text,
	"service_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"business_hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"license_number" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"author_id" uuid,
	"note_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" varchar(150) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"email" varchar(255),
	"service_type" varchar(100) NOT NULL,
	"property_location" varchar(255) NOT NULL,
	"project_description" text,
	"preferred_contact_method" varchar(20) DEFAULT 'phone' NOT NULL,
	"lead_source" varchar(50) DEFAULT 'website_form' NOT NULL,
	"status" varchar(30) DEFAULT 'new' NOT NULL,
	"automation_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"submission_date" timestamp with time zone DEFAULT now() NOT NULL,
	"last_status_update" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggregate_type" varchar(50) DEFAULT 'lead' NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"event_type" varchar(50) DEFAULT 'lead.created' NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"idempotency_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 5 NOT NULL,
	"next_retry_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar(255) PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"role" varchar(20) DEFAULT 'staff' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_aggregate_id_leads_id_fk" FOREIGN KEY ("aggregate_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_lead_notes_lead_id" ON "lead_notes" USING btree ("lead_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_leads_status" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_leads_submission_date" ON "leads" USING btree ("submission_date");--> statement-breakpoint
CREATE INDEX "idx_leads_automation_status" ON "leads" USING btree ("automation_status");--> statement-breakpoint
CREATE INDEX "idx_outbox_events_dispatch" ON "outbox_events" USING btree ("status","next_retry_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");