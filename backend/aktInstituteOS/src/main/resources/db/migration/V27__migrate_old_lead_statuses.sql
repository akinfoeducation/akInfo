-- ============================================================
-- V27: Migrate old lead statuses to new Phase-1 status set
-- Old → New mapping:
--   NEW            → NEW_LEAD
--   CONVERTED      → BOOKING_CONFIRMED
--   LOST           → CLOSED
--   DEMO_SCHEDULED → FOLLOW_UP
--   NEGOTIATION    → INTERESTED
-- ============================================================

UPDATE leads SET status = 'NEW_LEAD'          WHERE status = 'NEW';
UPDATE leads SET status = 'BOOKING_CONFIRMED' WHERE status = 'CONVERTED';
UPDATE leads SET status = 'CLOSED'            WHERE status = 'LOST';
UPDATE leads SET status = 'FOLLOW_UP'         WHERE status = 'DEMO_SCHEDULED';
UPDATE leads SET status = 'INTERESTED'        WHERE status = 'NEGOTIATION';
