-- ============================================================
-- V26: Caller CRM performance indexes
-- Targets the exact query patterns used by callers daily
-- ============================================================

-- Caller lead list: assigned_to_id + status + deleted_at (most common filter)
CREATE INDEX IF NOT EXISTS idx_leads_caller_status
    ON leads(institute_id, assigned_to_id, status, deleted_at);

-- Caller dashboard date-range queries (assigned_at filter)
CREATE INDEX IF NOT EXISTS idx_leads_caller_assigned_at
    ON leads(institute_id, assigned_to_id, assigned_at, deleted_at);

-- Follow-up pending list per caller (ordered by scheduled_at)
CREATE INDEX IF NOT EXISTS idx_followups_caller_pending
    ON follow_ups(institute_id, created_by, is_done, scheduled_at);

-- Follow-up list for a specific lead
CREATE INDEX IF NOT EXISTS idx_followups_lead_scheduled
    ON follow_ups(lead_id, scheduled_at);

-- Admission bookings lookup by lead (used on every booking check)
CREATE INDEX IF NOT EXISTS idx_bookings_lead_status
    ON admission_bookings(institute_id, lead_id, booking_status);

-- Batch seat availability (used on every booking verify)
CREATE INDEX IF NOT EXISTS idx_batches_seats
    ON batches(institute_id, id, available_seats) WHERE deleted_at IS NULL;

-- Leads search (full-text on phone — most common search by caller)
CREATE INDEX IF NOT EXISTS idx_leads_phone_institute
    ON leads(institute_id, phone) WHERE deleted_at IS NULL;

-- Optimistic locking: add version column to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
