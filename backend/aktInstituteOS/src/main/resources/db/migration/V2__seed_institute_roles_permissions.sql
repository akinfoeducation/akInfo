-- ============================================================
-- V2: Seed default institute, roles, and permissions
-- ============================================================

-- Default institute (AKT Info Institute)
INSERT INTO institutes (uuid, name, code, tagline, city, state, phone, email, is_active)
VALUES (gen_random_uuid()::text, 'AKT Info Institute', 'AKT', 'Excellence in Computer Education', 'Rajkot', 'Gujarat',
        '+91-0000000000', 'info@aktinstitute.com', TRUE);

-- ============================================================
-- PERMISSIONS — all system-level permissions
-- ============================================================
INSERT INTO permissions (name, code, resource, action, description)
VALUES
-- USER management
('View Users', 'USER_VIEW', 'USER', 'READ', 'View user profiles'),
('Create Users', 'USER_CREATE', 'USER', 'CREATE', 'Create new users'),
('Update Users', 'USER_UPDATE', 'USER', 'UPDATE', 'Edit user profiles'),
('Delete Users', 'USER_DELETE', 'USER', 'DELETE', 'Delete/deactivate users'),

-- STUDENT management
('View Students', 'STUDENT_VIEW', 'STUDENT', 'READ', 'View student profiles and history'),
('Create Students', 'STUDENT_CREATE', 'STUDENT', 'CREATE', 'Register new students'),
('Update Students', 'STUDENT_UPDATE', 'STUDENT', 'UPDATE', 'Edit student information'),
('Delete Students', 'STUDENT_DELETE', 'STUDENT', 'DELETE', 'Soft delete students'),
('Export Students', 'STUDENT_EXPORT', 'STUDENT', 'EXPORT', 'Export student data'),

-- LEAD (CRM) management
('View Leads', 'LEAD_VIEW', 'LEAD', 'READ', 'View CRM leads'),
('Create Leads', 'LEAD_CREATE', 'LEAD', 'CREATE', 'Add new leads'),
('Update Leads', 'LEAD_UPDATE', 'LEAD', 'UPDATE', 'Edit lead information and add activities'),
('Delete Leads', 'LEAD_DELETE', 'LEAD', 'DELETE', 'Delete leads'),
('Assign Leads', 'LEAD_ASSIGN', 'LEAD', 'UPDATE', 'Assign leads to counsellors'),
('Convert Leads', 'LEAD_CONVERT', 'LEAD', 'UPDATE', 'Convert lead to student/admission'),
('Export Leads', 'LEAD_EXPORT', 'LEAD', 'EXPORT', 'Export lead data'),

-- ADMISSION management
('View Admissions', 'ADMISSION_VIEW', 'ADMISSION', 'READ', 'View admissions'),
('Create Admissions', 'ADMISSION_CREATE', 'ADMISSION', 'CREATE', 'Process new admissions'),
('Update Admissions', 'ADMISSION_UPDATE', 'ADMISSION', 'UPDATE', 'Edit admission details'),
('Cancel Admissions', 'ADMISSION_CANCEL', 'ADMISSION', 'UPDATE', 'Cancel an admission'),

-- COURSE management
('View Courses', 'COURSE_VIEW', 'COURSE', 'READ', 'View courses and batches'),
('Create Courses', 'COURSE_CREATE', 'COURSE', 'CREATE', 'Add new courses'),
('Update Courses', 'COURSE_UPDATE', 'COURSE', 'UPDATE', 'Edit course details'),
('Delete Courses', 'COURSE_DELETE', 'COURSE', 'DELETE', 'Delete courses'),

-- BATCH management
('View Batches', 'BATCH_VIEW', 'BATCH', 'READ', 'View batch schedules'),
('Create Batches', 'BATCH_CREATE', 'BATCH', 'CREATE', 'Create new batches'),
('Update Batches', 'BATCH_UPDATE', 'BATCH', 'UPDATE', 'Edit batch details'),
('Delete Batches', 'BATCH_DELETE', 'BATCH', 'DELETE', 'Delete batches'),

-- FEE management
('View Fees', 'FEE_VIEW', 'FEE', 'READ', 'View fee accounts and payment history'),
('Collect Fees', 'FEE_COLLECT', 'FEE', 'CREATE', 'Record fee payments'),
('Cancel Payments', 'FEE_CANCEL', 'FEE', 'UPDATE', 'Cancel fee payments'),
('Manage Fee Structures', 'FEE_STRUCTURE_MANAGE', 'FEE', 'UPDATE', 'Create and edit fee structures'),
('View Fee Reports', 'FEE_REPORT', 'FEE', 'EXPORT', 'View and export fee reports'),

-- STAFF management
('View Staff', 'STAFF_VIEW', 'STAFF', 'READ', 'View staff profiles'),
('Manage Staff', 'STAFF_MANAGE', 'STAFF', 'UPDATE', 'Create and edit staff profiles'),

-- ATTENDANCE management
('View Attendance', 'ATTENDANCE_VIEW', 'ATTENDANCE', 'READ', 'View attendance records'),
('Mark Attendance', 'ATTENDANCE_MARK', 'ATTENDANCE', 'CREATE', 'Mark student attendance'),
('Edit Attendance', 'ATTENDANCE_EDIT', 'ATTENDANCE', 'UPDATE', 'Correct attendance records'),

-- EXAM management
('View Exams', 'EXAM_VIEW', 'EXAM', 'READ', 'View exams and results'),
('Manage Exams', 'EXAM_MANAGE', 'EXAM', 'UPDATE', 'Create exams and enter marks'),

-- REPORT management
('View Reports', 'REPORT_VIEW', 'REPORT', 'READ', 'Access reports and analytics'),
('Export Reports', 'REPORT_EXPORT', 'REPORT', 'EXPORT', 'Export reports to Excel/PDF'),

-- SETTINGS
('Manage Settings', 'SETTINGS_MANAGE', 'SETTINGS', 'UPDATE', 'Manage institute settings, CMS, roles');

-- ============================================================
-- ROLES — system roles for institute_id=1
-- ============================================================
INSERT INTO roles (institute_id, name, code, description, is_system, is_active)
VALUES (1, 'Super Admin', 'SUPER_ADMIN', 'Full system access, all permissions', TRUE, TRUE),
       (1, 'Institute Admin', 'INSTITUTE_ADMIN', 'Institute-level admin, most permissions', TRUE, TRUE),
       (1, 'Counsellor', 'COUNSELLOR', 'CRM leads, admissions, fee collection', TRUE, TRUE),
       (1, 'Faculty', 'FACULTY', 'Attendance marking, exam marks, batch view', TRUE, TRUE),
       (1, 'Student', 'STUDENT', 'Own profile, attendance, results, fee status', TRUE, TRUE),
       (1, 'Parent', 'PARENT', 'Child profile, attendance, fees read-only', TRUE, TRUE);

-- ============================================================
-- ROLE ↔ PERMISSION ASSIGNMENTS
-- ============================================================

-- SUPER_ADMIN: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'SUPER_ADMIN' AND institute_id = 1), id
FROM permissions;

-- INSTITUTE_ADMIN: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'INSTITUTE_ADMIN' AND institute_id = 1), id
FROM permissions;

-- COUNSELLOR: students, leads, admissions, fees, courses view, batches view, reports view
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'COUNSELLOR' AND institute_id = 1), id
FROM permissions
WHERE code IN (
    'STUDENT_VIEW', 'STUDENT_CREATE', 'STUDENT_UPDATE',
    'LEAD_VIEW', 'LEAD_CREATE', 'LEAD_UPDATE', 'LEAD_ASSIGN', 'LEAD_CONVERT',
    'ADMISSION_VIEW', 'ADMISSION_CREATE', 'ADMISSION_UPDATE',
    'COURSE_VIEW', 'BATCH_VIEW',
    'FEE_VIEW', 'FEE_COLLECT',
    'REPORT_VIEW'
);

-- FACULTY: batch view, attendance, exams, student view
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'FACULTY' AND institute_id = 1), id
FROM permissions
WHERE code IN (
    'STUDENT_VIEW',
    'BATCH_VIEW', 'COURSE_VIEW',
    'ATTENDANCE_VIEW', 'ATTENDANCE_MARK', 'ATTENDANCE_EDIT',
    'EXAM_VIEW', 'EXAM_MANAGE'
);

-- STUDENT: basic views
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'STUDENT' AND institute_id = 1), id
FROM permissions
WHERE code IN (
    'STUDENT_VIEW',
    'ATTENDANCE_VIEW',
    'EXAM_VIEW',
    'FEE_VIEW'
);

-- PARENT: read-only
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'PARENT' AND institute_id = 1), id
FROM permissions
WHERE code IN (
    'STUDENT_VIEW',
    'ATTENDANCE_VIEW',
    'EXAM_VIEW',
    'FEE_VIEW'
);

-- ============================================================
-- DEFAULT SUPER ADMIN USER
-- Password: Admin@1234  ← CHANGE IMMEDIATELY IN PRODUCTION
-- BCrypt strength 12, verified hash:
-- ============================================================
INSERT INTO users (uuid, institute_id, username, email, password_hash, first_name, last_name, is_active,
                   is_email_verified, password_changed_at)
VALUES (gen_random_uuid()::text, 1, 'superadmin', 'admin@aktinstitute.com',
        '$2b$12$3erRJViRwxedxrTmHx5sZeMtqf7h.UZFZ6oX3t8nR9r7.6Z3gFhR2',
        'Super', 'Admin', TRUE, TRUE, NOW());

-- Assign SUPER_ADMIN role to the default user
INSERT INTO user_roles (user_id, role_id)
VALUES ((SELECT id FROM users WHERE username = 'superadmin' AND institute_id = 1),
        (SELECT id FROM roles WHERE code = 'SUPER_ADMIN' AND institute_id = 1));
