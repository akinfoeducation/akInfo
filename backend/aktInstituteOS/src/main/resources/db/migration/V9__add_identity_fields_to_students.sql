-- Add Aadhaar and PAN number fields to the students table
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(12),
    ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10);
