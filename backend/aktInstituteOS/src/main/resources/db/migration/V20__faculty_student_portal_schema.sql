-- =============================================================================
-- V20: Faculty profiles, batch-faculty assignments, timetable, class sessions,
--      student attendance, faculty attendance, study materials, student portal link
-- =============================================================================

-- ── 1. Faculty extended profiles (1:1 with users) ────────────────────────────
CREATE TABLE faculty_profiles (
    id               BIGSERIAL PRIMARY KEY,
    institute_id     BIGINT       NOT NULL REFERENCES institutes(id),
    user_id          BIGINT       NOT NULL UNIQUE REFERENCES users(id),
    qualification    VARCHAR(500),
    experience_years INT          DEFAULT 0,
    subjects         TEXT,
    skills           VARCHAR(1000),
    employee_type    VARCHAR(20)  DEFAULT 'FULL_TIME',  -- FULL_TIME PART_TIME VISITING CONTRACT
    bio              TEXT,
    linkedin_url     VARCHAR(500),
    created_at       TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    created_by       BIGINT,
    updated_by       BIGINT,
    deleted_at       TIMESTAMPTZ
);

CREATE INDEX idx_faculty_profiles_institute ON faculty_profiles(institute_id);
CREATE INDEX idx_faculty_profiles_user      ON faculty_profiles(user_id);

CREATE OR REPLACE FUNCTION update_faculty_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$;
CREATE TRIGGER trg_faculty_profiles_updated_at
    BEFORE UPDATE ON faculty_profiles
    FOR EACH ROW EXECUTE FUNCTION update_faculty_profiles_updated_at();

-- ── 2. Batch ↔ Faculty assignments ──────────────────────────────────────────
CREATE TABLE batch_faculty (
    id               BIGSERIAL PRIMARY KEY,
    institute_id     BIGINT       NOT NULL REFERENCES institutes(id),
    batch_id         BIGINT       NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    faculty_user_id  BIGINT       NOT NULL REFERENCES users(id),
    subject          VARCHAR(200),
    role             VARCHAR(20)  DEFAULT 'PRIMARY',   -- PRIMARY ASSISTANT
    is_active        BOOLEAN      DEFAULT TRUE,
    assigned_at      TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    assigned_by      BIGINT       REFERENCES users(id),
    UNIQUE (batch_id, faculty_user_id, subject)
);

CREATE INDEX idx_batch_faculty_batch   ON batch_faculty(batch_id);
CREATE INDEX idx_batch_faculty_faculty ON batch_faculty(faculty_user_id);

-- ── 3. Timetable (recurring weekly slots) ────────────────────────────────────
CREATE TABLE timetable (
    id               BIGSERIAL PRIMARY KEY,
    uuid             VARCHAR(36)  UNIQUE DEFAULT gen_random_uuid()::TEXT,
    institute_id     BIGINT       NOT NULL REFERENCES institutes(id),
    batch_id         BIGINT       NOT NULL REFERENCES batches(id),
    faculty_user_id  BIGINT       REFERENCES users(id),
    subject          VARCHAR(200),
    day_of_week      INT,                               -- 1=Mon … 7=Sun (ISO)
    specific_date    DATE,                              -- for one-off overrides
    start_time       TIME         NOT NULL,
    end_time         TIME         NOT NULL,
    classroom        VARCHAR(200),
    mode             VARCHAR(20)  DEFAULT 'OFFLINE',   -- OFFLINE ONLINE HYBRID
    online_link      VARCHAR(500),
    effective_from   DATE,
    effective_until  DATE,
    is_active        BOOLEAN      DEFAULT TRUE,
    created_at       TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    created_by       BIGINT,
    updated_by       BIGINT,
    deleted_at       TIMESTAMPTZ
);

CREATE INDEX idx_timetable_institute ON timetable(institute_id);
CREATE INDEX idx_timetable_batch     ON timetable(batch_id);
CREATE INDEX idx_timetable_faculty   ON timetable(faculty_user_id);

CREATE OR REPLACE FUNCTION update_timetable_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$;
CREATE TRIGGER trg_timetable_updated_at
    BEFORE UPDATE ON timetable
    FOR EACH ROW EXECUTE FUNCTION update_timetable_updated_at();

-- ── 4. Class sessions (actual classes conducted) ─────────────────────────────
CREATE TABLE class_sessions (
    id                  BIGSERIAL PRIMARY KEY,
    uuid                VARCHAR(36)  UNIQUE DEFAULT gen_random_uuid()::TEXT,
    institute_id        BIGINT       NOT NULL REFERENCES institutes(id),
    batch_id            BIGINT       NOT NULL REFERENCES batches(id),
    timetable_id        BIGINT       REFERENCES timetable(id),
    faculty_user_id     BIGINT       NOT NULL REFERENCES users(id),
    session_date        DATE         NOT NULL,
    start_time          TIME,
    end_time            TIME,
    subject             VARCHAR(200),
    topic_covered       TEXT,
    session_notes       TEXT,
    homework_notes      TEXT,
    status              VARCHAR(20)  DEFAULT 'SCHEDULED',  -- SCHEDULED COMPLETED CANCELLED HOLIDAY
    attendance_marked   BOOLEAN      DEFAULT FALSE,
    created_at          TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    created_by          BIGINT,
    updated_by          BIGINT,
    UNIQUE (batch_id, faculty_user_id, session_date, start_time)
);

CREATE INDEX idx_class_sessions_institute ON class_sessions(institute_id);
CREATE INDEX idx_class_sessions_batch     ON class_sessions(batch_id);
CREATE INDEX idx_class_sessions_faculty   ON class_sessions(faculty_user_id);
CREATE INDEX idx_class_sessions_date      ON class_sessions(session_date);

CREATE OR REPLACE FUNCTION update_class_sessions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$;
CREATE TRIGGER trg_class_sessions_updated_at
    BEFORE UPDATE ON class_sessions
    FOR EACH ROW EXECUTE FUNCTION update_class_sessions_updated_at();

-- ── 5. Student attendance (per session) ──────────────────────────────────────
CREATE TABLE student_attendance (
    id                BIGSERIAL PRIMARY KEY,
    institute_id      BIGINT       NOT NULL REFERENCES institutes(id),
    class_session_id  BIGINT       NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    batch_id          BIGINT       NOT NULL REFERENCES batches(id),
    student_id        BIGINT       NOT NULL REFERENCES students(id),
    status            VARCHAR(20)  NOT NULL DEFAULT 'ABSENT',  -- PRESENT ABSENT LATE HOLIDAY
    remarks           TEXT,
    marked_by         BIGINT       NOT NULL REFERENCES users(id),
    marked_at         TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (class_session_id, student_id)
);

CREATE INDEX idx_student_attendance_session ON student_attendance(class_session_id);
CREATE INDEX idx_student_attendance_student ON student_attendance(student_id);
CREATE INDEX idx_student_attendance_batch   ON student_attendance(batch_id);

-- ── 6. Faculty attendance (daily check-in/out) ───────────────────────────────
CREATE TABLE faculty_attendance (
    id                BIGSERIAL PRIMARY KEY,
    institute_id      BIGINT       NOT NULL REFERENCES institutes(id),
    faculty_user_id   BIGINT       NOT NULL REFERENCES users(id),
    attendance_date   DATE         NOT NULL,
    check_in_at       TIMESTAMPTZ,
    check_out_at      TIMESTAMPTZ,
    status            VARCHAR(20)  DEFAULT 'PRESENT',  -- PRESENT ABSENT HALF_DAY LEAVE HOLIDAY
    notes             TEXT,
    created_at        TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (faculty_user_id, attendance_date)
);

CREATE INDEX idx_faculty_attendance_user ON faculty_attendance(faculty_user_id);
CREATE INDEX idx_faculty_attendance_date ON faculty_attendance(attendance_date);

-- ── 7. Study materials ───────────────────────────────────────────────────────
CREATE TABLE study_materials (
    id               BIGSERIAL PRIMARY KEY,
    uuid             VARCHAR(36)   UNIQUE DEFAULT gen_random_uuid()::TEXT,
    institute_id     BIGINT        NOT NULL REFERENCES institutes(id),
    course_id        BIGINT        REFERENCES courses(id),
    batch_id         BIGINT        REFERENCES batches(id),
    subject          VARCHAR(200),
    uploaded_by      BIGINT        NOT NULL REFERENCES users(id),
    title            VARCHAR(500)  NOT NULL,
    description      TEXT,
    material_type    VARCHAR(30)   NOT NULL,  -- PDF NOTES PPT ASSIGNMENT LINK VIDEO
    file_url         VARCHAR(1000),
    file_name        VARCHAR(500),
    file_size_bytes  BIGINT,
    external_link    VARCHAR(1000),
    is_active        BOOLEAN       DEFAULT TRUE,
    created_at       TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
    created_by       BIGINT,
    updated_by       BIGINT,
    deleted_at       TIMESTAMPTZ
);

CREATE INDEX idx_study_materials_institute ON study_materials(institute_id);
CREATE INDEX idx_study_materials_batch     ON study_materials(batch_id);
CREATE INDEX idx_study_materials_course    ON study_materials(course_id);

CREATE OR REPLACE FUNCTION update_study_materials_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$;
CREATE TRIGGER trg_study_materials_updated_at
    BEFORE UPDATE ON study_materials
    FOR EACH ROW EXECUTE FUNCTION update_study_materials_updated_at();

-- ── 8. Student portal link ───────────────────────────────────────────────────
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
