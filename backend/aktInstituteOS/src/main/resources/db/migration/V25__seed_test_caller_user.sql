-- ============================================================
-- V25: Seed test caller user for development/QA
-- username: caller / password: caller123
-- password_hash = bcrypt('caller123', cost=10)
-- ============================================================

INSERT INTO users (
    uuid, institute_id, username, email, password_hash,
    first_name, last_name, phone, is_active, is_email_verified
)
VALUES (
    gen_random_uuid()::text,
    1,
    'caller',
    'caller@aktinstitute.com',
    '$2b$10$CkK.SfCP/fTNzhbUo1FjgO0ZeN5KV9HIjLR4NGycmrsHtNeAM.qEu',
    'Test',
    'Caller',
    '9000000001',
    TRUE,
    TRUE
)
ON CONFLICT (username, institute_id) DO NOTHING;

-- Assign CALLER role to this user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.username = 'caller'
  AND u.institute_id = 1
  AND r.code = 'CALLER'
  AND r.institute_id = 1
ON CONFLICT DO NOTHING;

-- Also seed a test institute admin user
-- username: instadmin / password: admin123
-- password_hash = bcrypt('admin123', cost=10)
INSERT INTO users (
    uuid, institute_id, username, email, password_hash,
    first_name, last_name, phone, is_active, is_email_verified
)
VALUES (
    gen_random_uuid()::text,
    1,
    'instadmin',
    'instadmin@aktinstitute.com',
    '$2b$10$Dk4OtMO0V.ydLBR14FrqF.mQOcS5nlOaqistFJ340FdGHcXjxoIOm',
    'Institute',
    'Admin',
    '9000000002',
    TRUE,
    TRUE
)
ON CONFLICT (username, institute_id) DO NOTHING;

-- Assign INSTITUTE_ADMIN role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.username = 'instadmin'
  AND u.institute_id = 1
  AND r.code = 'INSTITUTE_ADMIN'
  AND r.institute_id = 1
ON CONFLICT DO NOTHING;
