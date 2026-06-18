-- Add home address, parent email, and payment note to students_info
ALTER TABLE students_info
  ADD COLUMN IF NOT EXISTS home_address TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS payment_note TEXT;
