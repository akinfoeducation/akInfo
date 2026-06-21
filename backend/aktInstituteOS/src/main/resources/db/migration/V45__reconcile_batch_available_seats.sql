-- ═══════════════════════════════════════════════════════════════════════════════
-- V45 — Reconcile batches.available_seats to the authoritative booking model (C3)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- available_seats is the single source of truth for seat availability. A seat is
-- consumed when a booking is CONFIRMED and restored when that booking is cancelled
-- or released. Historically several paths (not-interested/invalid, branch transfer,
-- admission cancel/delete) failed to restore seats, and restoreSeat was unbounded —
-- so available_seats can have drifted away from reality on existing data.
--
-- This one-time backfill recomputes, for every capacity-bounded batch:
--     available_seats = max_capacity − (active CONFIRMED bookings on that batch)
-- clamped to [0, max_capacity]. Batches with no confirmed bookings are reset to full.
-- Uncapped batches (max_capacity IS NULL) have no finite pool and are left untouched.

UPDATE batches b
SET    available_seats = GREATEST(0, b.max_capacity - COALESCE((
           SELECT COUNT(*)
           FROM   admission_bookings bk
           WHERE  bk.batch_id       = b.id
             AND  bk.booking_status = 'BOOKING_CONFIRMED'
             AND  bk.is_active      = TRUE
       ), 0)),
       updated_at = CURRENT_TIMESTAMP
WHERE  b.max_capacity IS NOT NULL;
