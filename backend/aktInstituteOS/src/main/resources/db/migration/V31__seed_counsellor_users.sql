-- ============================================================
-- V31: Seed two test Counsellor users
-- Password = "Password@123" (same bcrypt hash as caller seed)
-- ============================================================

INSERT INTO users (uuid, institute_id, username, email, password_hash,
                   first_name, last_name, phone, is_active, is_email_verified)
VALUES
  (gen_random_uuid()::TEXT, 1,
   'neha.counsellor', 'neha.counsellor@akt.in',
   '$2b$10$CkK.SfCP/fTNzhbUo1FjgO0ZeN5KV9HIjLR4NGycmrsHtNeAM.qEu',
   'Neha', 'Sharma', '9822000201', TRUE, TRUE),

  (gen_random_uuid()::TEXT, 1,
   'ravi.counsellor',  'ravi.counsellor@akt.in',
   '$2b$10$CkK.SfCP/fTNzhbUo1FjgO0ZeN5KV9HIjLR4NGycmrsHtNeAM.qEu',
   'Ravi', 'Gupta',  '9822000202', TRUE, TRUE)
ON CONFLICT (username, institute_id) DO NOTHING;

-- Assign COUNSELLOR role to both users
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM   users u
CROSS  JOIN roles r
WHERE  u.username IN ('neha.counsellor', 'ravi.counsellor')
  AND  u.institute_id = 1
  AND  r.code = 'COUNSELLOR'
  AND  r.institute_id = 1
ON CONFLICT (user_id, role_id) DO NOTHING;
