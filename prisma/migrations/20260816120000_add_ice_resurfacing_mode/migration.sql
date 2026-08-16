-- AlterTable: add per-event ice resurfacing override (nullable, default NULL = inherit from category)
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "ice_resurfacing_mode" TEXT;
