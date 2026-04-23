-- =========================================================================
-- PILL PAL SCHEMA UPDATE: Migration from MAC to Serial Number
-- =========================================================================
-- Instructions: Please paste this entire script into your Supabase SQL Editor and click RUN.

-- 1. Rename the column in the devices table
ALTER TABLE public.devices RENAME COLUMN mac_address TO serial_number;

-- 2. Drop the existing dummy device and medications if it exists just to start perfectly clean
DELETE FROM public.dispense_logs;
DELETE FROM public.medication_slots;
DELETE FROM public.devices;

-- 3. Insert Dummy Devices (Pre-manufactured stock waiting to be claimed)
INSERT INTO public.devices (id, serial_number, current_slot, battery_level, last_sync, owner_id)
VALUES 
  (gen_random_uuid(), 'SN-A1B2C3', 0, 100, now(), null),
  (gen_random_uuid(), 'SN-X9Y8Z7', 0, 100, now(), null),
  (gen_random_uuid(), 'SN-M4D3H1', 0, 100, now(), null);

-- Note: The owner_id is explicitly NULL because these are brand "new" devices 
-- waiting for users to claim them via the setup dashboard!
