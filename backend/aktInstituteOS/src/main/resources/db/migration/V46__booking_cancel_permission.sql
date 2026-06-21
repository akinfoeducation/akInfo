-- ═══════════════════════════════════════════════════════════════════════════════
-- V46 — Split booking cancellation from verification (C6, separation of duties)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Previously the cancel endpoint required BOOKING_VERIFY, coupling it to payment
-- verification — so counsellors could not cancel any booking, and the only authority
-- that could cancel also happened to be the one that verifies payments.
--
-- New model:
--   • BOOKING_CANCEL — may cancel a PAYMENT_PENDING booking (no money moved yet).
--     Granted to COUNSELLOR, ACCOUNTANT, INSTITUTE_ADMIN, SUPER_ADMIN.
--   • Cancelling a BOOKING_CONFIRMED booking reverses a verified payment + restores a
--     seat — this stays restricted to BOOKING_VERIFY holders (Accountant/Admins) and is
--     enforced in AdmissionBookingService.cancelBooking (CONFIRMED_CANCEL_DENIED).
--
-- Permissions are global/shared; roles are per-institute (same model as V36/V38).

INSERT INTO permissions (name, code, resource, action, description)
SELECT 'Cancel Booking', 'BOOKING_CANCEL', 'BOOKING', 'UPDATE', 'Cancel an admission booking'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'BOOKING_CANCEL');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
JOIN   permissions p ON p.code = 'BOOKING_CANCEL'
WHERE  r.code IN ('COUNSELLOR', 'ACCOUNTANT', 'INSTITUTE_ADMIN', 'SUPER_ADMIN')
ON CONFLICT DO NOTHING;
