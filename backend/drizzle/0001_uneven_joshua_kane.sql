CREATE TABLE "n8n_processed_events" (
	"idempotency_key" uuid PRIMARY KEY NOT NULL,
	"lead_id" uuid NOT NULL,
	"event_type" varchar(50) DEFAULT 'lead.created' NOT NULL,
	"status" varchar(20) DEFAULT 'processing' NOT NULL,
	"customer_notified" boolean DEFAULT false NOT NULL,
	"staff_notified" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "n8n_processed_events" ADD CONSTRAINT "n8n_processed_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_n8n_processed_events_lead" ON "n8n_processed_events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_n8n_processed_events_status" ON "n8n_processed_events" USING btree ("status");