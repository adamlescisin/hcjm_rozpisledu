ALTER TABLE "theme_settings" ADD COLUMN IF NOT EXISTS "schedule_weeks_ahead" INTEGER NOT NULL DEFAULT 4;
