-- ── Courses ───────────────────────────────────────────────────────────────
CREATE TABLE courses (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid            VARCHAR(36)    NOT NULL UNIQUE,
    institute_id    BIGINT         NOT NULL REFERENCES institutes(id),
    name            VARCHAR(200)   NOT NULL,
    code            VARCHAR(20)    NOT NULL,
    description     TEXT,
    duration_weeks  INT,
    fees            NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status          VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP,
    created_by      BIGINT         REFERENCES users(id),
    updated_by      BIGINT         REFERENCES users(id),
    CONSTRAINT uq_course_code_institute UNIQUE (code, institute_id)
);

CREATE INDEX idx_courses_institute_id ON courses(institute_id);
CREATE INDEX idx_courses_status       ON courses(status);
CREATE INDEX idx_courses_deleted_at   ON courses(deleted_at);

CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Batches ───────────────────────────────────────────────────────────────
CREATE TABLE batches (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid            VARCHAR(36)    NOT NULL UNIQUE,
    institute_id    BIGINT         NOT NULL REFERENCES institutes(id),
    course_id       BIGINT         NOT NULL REFERENCES courses(id),
    name            VARCHAR(200)   NOT NULL,
    timing          VARCHAR(100),
    start_date      DATE,
    end_date        DATE,
    max_capacity    INT,
    status          VARCHAR(20)    NOT NULL DEFAULT 'UPCOMING',
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP,
    created_by      BIGINT         REFERENCES users(id),
    updated_by      BIGINT         REFERENCES users(id)
);

CREATE INDEX idx_batches_institute_id ON batches(institute_id);
CREATE INDEX idx_batches_course_id    ON batches(course_id);
CREATE INDEX idx_batches_status       ON batches(status);
CREATE INDEX idx_batches_deleted_at   ON batches(deleted_at);

CREATE TRIGGER trg_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Course permissions ────────────────────────────────────────────────────
INSERT INTO permissions (name, code, resource, action, description)
VALUES
    ('View Courses',   'COURSE_VIEW',   'COURSE', 'READ',   'View course and batch list'),
    ('Create Courses', 'COURSE_CREATE', 'COURSE', 'CREATE', 'Create courses and batches'),
    ('Update Courses', 'COURSE_UPDATE', 'COURSE', 'UPDATE', 'Edit courses and batches'),
    ('Delete Courses', 'COURSE_DELETE', 'COURSE', 'DELETE', 'Soft-delete courses and batches')
ON CONFLICT (code) DO NOTHING;

-- ── Grant to SUPER_ADMIN ──────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'SUPER_ADMIN'
  AND  p.resource = 'COURSE'
  AND  r.institute_id = 1
ON CONFLICT DO NOTHING;

-- ── Seed AKT Institute courses ────────────────────────────────────────────
INSERT INTO courses (uuid, institute_id, name, code, description, duration_weeks, fees, status)
VALUES
    (gen_random_uuid(), 1, 'Mobile Repairing Course',  'MRC',
     'Advanced Mobile repair, motherboard & components.',
     8, 15000, 'ACTIVE'),
    (gen_random_uuid(), 1, 'Laptop Repairing Course',  'LRC',
     'Advanced laptop chip-level repair, motherboard & components.',
     10, 20000, 'ACTIVE'),
    (gen_random_uuid(), 1, 'Display Repairing Course', 'DRC',
     'OLED, LCD, touch glass repair with modern machines.',
     6, 12000, 'ACTIVE'),
    (gen_random_uuid(), 1, 'iPhone Repairing Course',  'IRC',
     'Full iPhone series repair — hardware, Face ID, board-level.',
     8, 18000, 'ACTIVE'),
    (gen_random_uuid(), 1, 'Android Repairing Course', 'ARC',
     'Samsung, OnePlus, Xiaomi, Oppo & all Android brands.',
     6, 12000, 'ACTIVE')
ON CONFLICT (code, institute_id) DO NOTHING;
