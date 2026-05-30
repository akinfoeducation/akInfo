-- ============================================================
-- V15: Multi-institute subdomain support
--      - Adds subdomain column to institutes
--      - Seeds AKT Institute Patna (institute_id = 2)
--      - Mirrors all roles + permissions from Delhi → Patna
--      - Creates default Super Admin for Patna
-- ============================================================

-- ── 1. Add subdomain column ────────────────────────────────────────────────
ALTER TABLE institutes ADD COLUMN subdomain VARCHAR(50) UNIQUE;

CREATE INDEX idx_institutes_subdomain ON institutes (subdomain);

-- ── 2. Assign subdomain to existing Institute #1 (Delhi) ──────────────────
UPDATE institutes SET subdomain = 'delhi' WHERE id = 1;

-- ── 3. Seed Institute #2: AKT Institute Patna ─────────────────────────────
INSERT INTO institutes (uuid, name, code, tagline, city, state, phone, email, subdomain, is_active)
VALUES (gen_random_uuid()::text,
        'AKT Institute Patna',
        'AKT-PAT',
        'Excellence in Computer Education',
        'Patna',
        'Bihar',
        '+91-0000000000',
        'info@aktinstitute.com',
        'patna',
        TRUE);

-- ── 4. Mirror all roles from Institute #1 → Institute #2 ──────────────────
-- Copies every role (same name, code, description, is_system) — no hardcoding
INSERT INTO roles (institute_id, name, code, description, is_system, is_active)
SELECT 2, name, code, description, is_system, is_active
FROM roles
WHERE institute_id = 1;

-- ── 5. Mirror all role→permission assignments to Institute #2 roles ────────
-- For each permission assigned to a role in institute 1,
-- assign the same permission to the matching role in institute 2
INSERT INTO role_permissions (role_id, permission_id)
SELECT r2.id, rp1.permission_id
FROM role_permissions rp1
JOIN roles r1 ON r1.id = rp1.role_id AND r1.institute_id = 1
JOIN roles r2 ON r2.code = r1.code  AND r2.institute_id = 2;

-- ── 6. Default Super Admin user for Patna ─────────────────────────────────
-- Password: Admin@1234 — BCrypt strength 12
-- !! CHANGE IMMEDIATELY IN PRODUCTION !!
INSERT INTO users (uuid, institute_id, username, email, password_hash,
                   first_name, last_name, is_active, is_email_verified, password_changed_at)
VALUES (gen_random_uuid()::text,
        2,
        'superadmin',
        'admin@aktinstitute.patna',
        '$2b$12$3erRJViRwxedxrTmHx5sZeMtqf7h.UZFZ6oX3t8nR9r7.6Z3gFhR2',
        'Super', 'Admin',
        TRUE, TRUE, NOW());

INSERT INTO user_roles (user_id, role_id)
VALUES (
    (SELECT id FROM users WHERE username = 'superadmin' AND institute_id = 2),
    (SELECT id FROM roles  WHERE code = 'SUPER_ADMIN'  AND institute_id = 2)
);
