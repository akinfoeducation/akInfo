-- ─────────────────────────────────────────────────────────────────────────────
-- V38: Provision the ACCOUNTANT role for EVERY institute.
--
-- V36 created the ACCOUNTANT role + payment-verification grants for institute_id = 1
-- (Delhi) only. Any other tenant (e.g. Patna, id = 2) had no ACCOUNTANT role at all,
-- so an accountant user there could not be assigned the role. This generalises the
-- provisioning to all existing institutes. Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create the ACCOUNTANT role for any institute that lacks it.
INSERT INTO roles (institute_id, name, code, description, is_system, is_active)
SELECT i.id, 'Accountant', 'ACCOUNTANT',
       'Verifies and confirms student payments; primary payment authority',
       TRUE, TRUE
FROM   institutes i
WHERE  NOT EXISTS (
    SELECT 1 FROM roles r WHERE r.code = 'ACCOUNTANT' AND r.institute_id = i.id
);

-- 2. Grant the payment-verification permissions to every ACCOUNTANT role.
--    (permissions are global/shared; roles are per-institute — same model as V36.)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
JOIN   permissions p
       ON p.code IN ('LEAD_VIEW', 'BOOKING_VIEW', 'BOOKING_VERIFY')
WHERE  r.code = 'ACCOUNTANT'
ON CONFLICT DO NOTHING;
