CREATE TYPE "public"."asset_type" AS ENUM('USDC', 'XLM');--> statement-breakpoint
CREATE TYPE "public"."payment_gateway" AS ENUM('gopay-merchant', 'dana-bisnis', 'midtrans', 'xendit', 'mayar', 'pakasir');--> statement-breakpoint
CREATE TYPE "public"."pool_type" AS ENUM('onramp', 'topup');--> statement-breakpoint
CREATE TABLE "pools" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_address" text NOT NULL,
	"pool" "pool_type" NOT NULL,
	"asset" "asset_type" NOT NULL,
	"deposited" numeric NOT NULL,
	"rate_markup_bps" integer NOT NULL,
	"max_order_fiat" integer NOT NULL,
	"payment_gateways" "payment_gateway"[] DEFAULT '{}' NOT NULL,
	"apy" numeric NOT NULL,
	"earned_fiat" numeric DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
