CREATE TYPE "public"."order_status" AS ENUM('created', 'paid_detected', 'proving', 'proved', 'fulfilled', 'expired');--> statement-breakpoint
CREATE TABLE "orders" (
	"order_id" text PRIMARY KEY NOT NULL,
	"amount_idr" integer NOT NULL,
	"usdc_amount" text NOT NULL,
	"seller_address" text NOT NULL,
	"buyer_address" text,
	"qr_string" text,
	"total_payment" integer,
	"expired_at" text,
	"status" "order_status" DEFAULT 'created' NOT NULL,
	"proof" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
