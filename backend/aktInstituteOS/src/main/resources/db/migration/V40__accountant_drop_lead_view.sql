-- ─────────────────────────────────────────────────────────────────────────────
-- V40: Remove LEAD_VIEW from the ACCOUNTANT role.
--
-- V36 granted LEAD_VIEW so the accountant could verify payments from the lead
-- detail page. That workflow now lives on the dedicated /payments queue, which
-- shows applicant name/phone directly (joined into the booking response), so the
-- accountant no longer needs CRM access. Removing it declutters their sidebar
-- (the whole CRM section disappears) and tightens the role to finance only.
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE code = 'ACCOUNTANT')
  AND permission_id IN (SELECT id FROM permissions WHERE code = 'LEAD_VIEW');
