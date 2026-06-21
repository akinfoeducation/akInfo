-- ─────────────────────────────────────────────────────────────────────────────
-- Grant LEAD_CREATE to the CALLER role.
--
-- The admin team's workflow: the admin seeds lead mobile numbers (bulk import),
-- a caller calls and fills in the rest via update. But callers also occasionally
-- take a fresh lead directly (e.g. a referral on the phone) and must be able to
-- create it. Until now the CALLER role had LEAD_VIEW/LEAD_UPDATE but not
-- LEAD_CREATE (V24), which blocked that path. This grants it across all institutes.
--
-- Duplicate prevention still applies on create (hard block, primary + alternate
-- number), so giving callers create rights does not weaken duplicate protection.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'CALLER'
  AND  p.code = 'LEAD_CREATE'
ON CONFLICT DO NOTHING;
