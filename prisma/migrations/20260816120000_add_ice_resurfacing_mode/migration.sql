-- Add ice resurfacing fields to event_category
-- Safe to re-run: IF NOT EXISTS prevents errors when columns already exist

ALTER TABLE event_category
  ADD COLUMN IF NOT EXISTS requires_ice_resurfacing_before BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_ice_resurfacing_after  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resurfacing_duration_minutes    INTEGER NOT NULL DEFAULT 15;
