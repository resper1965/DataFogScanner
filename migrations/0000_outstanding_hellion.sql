CREATE TABLE "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_name" text NOT NULL,
	"incident_date" timestamp NOT NULL,
	"incident_type" text NOT NULL,
	"description" text,
	"observations" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "detections" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_id" integer NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"context" text,
	"risk_level" text NOT NULL,
	"position" integer,
	"owner_name" text,
	"document_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"original_name" text NOT NULL,
	"size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"path" text NOT NULL,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"uploaded_at" timestamp DEFAULT now(),
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "processing_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_id" integer NOT NULL,
	"case_id" integer,
	"status" text DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0,
	"patterns" jsonb,
	"custom_regex" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "detections" ADD CONSTRAINT "detections_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;
