-- =========================================================================
-- PILL PAL SCHEMA: 3-Wheel System Migration
-- =========================================================================
-- Paste this entire script into Supabase SQL Editor and click RUN.

-- 1. Add 'wheel' column to medication_slots
ALTER TABLE public.medication_slots
  ADD COLUMN IF NOT EXISTS wheel TEXT DEFAULT 'morning'
  CHECK (wheel IN ('morning', 'midday', 'night'));

-- 2. Drop old unique constraint (was on device_id + slot_number alone)
ALTER TABLE public.medication_slots
  DROP CONSTRAINT IF EXISTS medication_slots_device_id_slot_number_key;

-- 3. Add new unique constraint (device + wheel + day-slot)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'medication_slots_device_wheel_slot_key'
  ) THEN
    ALTER TABLE public.medication_slots
      ADD CONSTRAINT medication_slots_device_wheel_slot_key
      UNIQUE (device_id, wheel, slot_number);
  END IF;
END $$;

-- 4. Clear old slot data (new wheel system — old rows are meaningless)
DELETE FROM public.dispense_logs;
DELETE FROM public.medication_slots;

-- Done! The app will now write rows with:
--   wheel:       'morning' | 'midday' | 'night'
--   slot_number: 1-7  (1=Monday ... 7=Sunday)
--   is_dispensed: true/false
