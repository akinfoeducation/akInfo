-- =============================================================================
-- V21: Permissions for Faculty + Student Portal modules
-- Note: ATTENDANCE_VIEW / ATTENDANCE_MARK / ATTENDANCE_EDIT already exist (V2)
-- =============================================================================

INSERT INTO permissions (name, code, resource, action, description) VALUES
    -- Faculty profiles
    ('View Faculty Profile',   'FACULTY_PROFILE_VIEW',   'FACULTY_PROFILE', 'READ',   'View faculty extended profiles'),
    ('Manage Faculty Profile',  'FACULTY_PROFILE_MANAGE', 'FACULTY_PROFILE', 'MANAGE', 'Create and update faculty profiles'),

    -- Timetable
    ('View Timetable',          'TIMETABLE_VIEW',         'TIMETABLE',       'READ',   'View batch timetable and schedule'),
    ('Manage Timetable',        'TIMETABLE_MANAGE',       'TIMETABLE',       'MANAGE', 'Create, update, delete timetable slots'),

    -- Class sessions
    ('View Class Sessions',     'CLASS_SESSION_VIEW',     'CLASS_SESSION',   'READ',   'View class session records'),
    ('Manage Class Sessions',   'CLASS_SESSION_MANAGE',   'CLASS_SESSION',   'MANAGE', 'Create and update class sessions and topic notes'),

    -- Study materials
    ('View Study Materials',    'MATERIAL_VIEW',          'MATERIAL',        'READ',   'View and download study materials'),
    ('Upload Study Materials',  'MATERIAL_UPLOAD',        'MATERIAL',        'CREATE', 'Upload study materials to assigned batches'),
    ('Manage Study Materials',  'MATERIAL_MANAGE',        'MATERIAL',        'MANAGE', 'Full management of all study materials'),

    -- Student portal
    ('Student Portal Access',   'STUDENT_PORTAL',         'STUDENT_PORTAL',  'ACCESS', 'Access the student self-service portal'),

    -- Batch faculty assignment
    ('View Batch Faculty',      'BATCH_FACULTY_VIEW',     'BATCH_FACULTY',   'READ',   'View faculty assigned to batches'),
    ('Manage Batch Faculty',    'BATCH_FACULTY_MANAGE',   'BATCH_FACULTY',   'MANAGE', 'Assign and remove faculty from batches')
ON CONFLICT (code) DO NOTHING;

-- ── Assign new permissions to existing roles for each institute ───────────────

DO $$
DECLARE
    inst_id   BIGINT;
    role_code TEXT;
    role_id   BIGINT;
    perm_code TEXT;
    perm_id   BIGINT;

    -- Permissions per role
    super_admin_perms TEXT[] := ARRAY[
        'FACULTY_PROFILE_VIEW','FACULTY_PROFILE_MANAGE',
        'TIMETABLE_VIEW','TIMETABLE_MANAGE',
        'CLASS_SESSION_VIEW','CLASS_SESSION_MANAGE',
        'MATERIAL_VIEW','MATERIAL_UPLOAD','MATERIAL_MANAGE',
        'BATCH_FACULTY_VIEW','BATCH_FACULTY_MANAGE'
    ];
    institute_admin_perms TEXT[] := ARRAY[
        'FACULTY_PROFILE_VIEW','FACULTY_PROFILE_MANAGE',
        'TIMETABLE_VIEW','TIMETABLE_MANAGE',
        'CLASS_SESSION_VIEW','CLASS_SESSION_MANAGE',
        'MATERIAL_VIEW','MATERIAL_UPLOAD','MATERIAL_MANAGE',
        'BATCH_FACULTY_VIEW','BATCH_FACULTY_MANAGE'
    ];
    faculty_perms TEXT[] := ARRAY[
        'FACULTY_PROFILE_VIEW',
        'TIMETABLE_VIEW',
        'CLASS_SESSION_VIEW','CLASS_SESSION_MANAGE',
        'MATERIAL_VIEW','MATERIAL_UPLOAD',
        'BATCH_FACULTY_VIEW'
    ];
    counsellor_perms TEXT[] := ARRAY[
        'TIMETABLE_VIEW',
        'CLASS_SESSION_VIEW',
        'MATERIAL_VIEW',
        'BATCH_FACULTY_VIEW'
    ];
    student_perms TEXT[] := ARRAY[
        'STUDENT_PORTAL',
        'MATERIAL_VIEW',
        'TIMETABLE_VIEW'
    ];
    parent_perms TEXT[] := ARRAY[
        'TIMETABLE_VIEW',
        'MATERIAL_VIEW'
    ];

BEGIN
    FOR inst_id IN SELECT id FROM institutes LOOP

        -- Super Admin
        SELECT id INTO role_id FROM roles WHERE institute_id=inst_id AND code='SUPER_ADMIN' LIMIT 1;
        IF role_id IS NOT NULL THEN
            FOREACH perm_code IN ARRAY super_admin_perms LOOP
                SELECT id INTO perm_id FROM permissions WHERE code=perm_code;
                IF perm_id IS NOT NULL THEN
                    INSERT INTO role_permissions(role_id,permission_id) VALUES(role_id,perm_id) ON CONFLICT DO NOTHING;
                END IF;
            END LOOP;
        END IF;

        -- Institute Admin
        SELECT id INTO role_id FROM roles WHERE institute_id=inst_id AND code='INSTITUTE_ADMIN' LIMIT 1;
        IF role_id IS NOT NULL THEN
            FOREACH perm_code IN ARRAY institute_admin_perms LOOP
                SELECT id INTO perm_id FROM permissions WHERE code=perm_code;
                IF perm_id IS NOT NULL THEN
                    INSERT INTO role_permissions(role_id,permission_id) VALUES(role_id,perm_id) ON CONFLICT DO NOTHING;
                END IF;
            END LOOP;
        END IF;

        -- Faculty
        SELECT id INTO role_id FROM roles WHERE institute_id=inst_id AND code='FACULTY' LIMIT 1;
        IF role_id IS NOT NULL THEN
            FOREACH perm_code IN ARRAY faculty_perms LOOP
                SELECT id INTO perm_id FROM permissions WHERE code=perm_code;
                IF perm_id IS NOT NULL THEN
                    INSERT INTO role_permissions(role_id,permission_id) VALUES(role_id,perm_id) ON CONFLICT DO NOTHING;
                END IF;
            END LOOP;
        END IF;

        -- Counsellor
        SELECT id INTO role_id FROM roles WHERE institute_id=inst_id AND code='COUNSELLOR' LIMIT 1;
        IF role_id IS NOT NULL THEN
            FOREACH perm_code IN ARRAY counsellor_perms LOOP
                SELECT id INTO perm_id FROM permissions WHERE code=perm_code;
                IF perm_id IS NOT NULL THEN
                    INSERT INTO role_permissions(role_id,permission_id) VALUES(role_id,perm_id) ON CONFLICT DO NOTHING;
                END IF;
            END LOOP;
        END IF;

        -- Student
        SELECT id INTO role_id FROM roles WHERE institute_id=inst_id AND code='STUDENT' LIMIT 1;
        IF role_id IS NOT NULL THEN
            FOREACH perm_code IN ARRAY student_perms LOOP
                SELECT id INTO perm_id FROM permissions WHERE code=perm_code;
                IF perm_id IS NOT NULL THEN
                    INSERT INTO role_permissions(role_id,permission_id) VALUES(role_id,perm_id) ON CONFLICT DO NOTHING;
                END IF;
            END LOOP;
        END IF;

        -- Parent
        SELECT id INTO role_id FROM roles WHERE institute_id=inst_id AND code='PARENT' LIMIT 1;
        IF role_id IS NOT NULL THEN
            FOREACH perm_code IN ARRAY parent_perms LOOP
                SELECT id INTO perm_id FROM permissions WHERE code=perm_code;
                IF perm_id IS NOT NULL THEN
                    INSERT INTO role_permissions(role_id,permission_id) VALUES(role_id,perm_id) ON CONFLICT DO NOTHING;
                END IF;
            END LOOP;
        END IF;

    END LOOP;
END $$;
