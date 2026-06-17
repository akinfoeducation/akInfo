-- ============================================================
-- V33: Grant COUNSELLOR_ASSIGN to CALLER role
--
-- Without this, callers cannot trigger the handoff after a student
-- visits the institute. They have no way to move a lead to a
-- counsellor — only admins could do it. This is a workflow blocker.
--
-- After this migration, callers can:
--   POST /leads/{id}/handoff  → hand off to a counsellor after visit
-- ============================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'CALLER'
  AND  p.code = 'COUNSELLOR_ASSIGN'
ON CONFLICT DO NOTHING;
