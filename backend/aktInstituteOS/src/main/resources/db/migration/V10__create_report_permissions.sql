-- ── Report permissions ────────────────────────────────────────────────────
INSERT INTO permissions (name, code, resource, action, description)
VALUES
    ('View Reports', 'REPORT_VIEW', 'REPORT', 'READ', 'Access analytics and reports dashboard')
ON CONFLICT (code) DO NOTHING;

-- ── Grant REPORT_VIEW to SUPER_ADMIN ──────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'SUPER_ADMIN'
  AND  p.code = 'REPORT_VIEW'
  AND  r.institute_id = 1
ON CONFLICT DO NOTHING;
