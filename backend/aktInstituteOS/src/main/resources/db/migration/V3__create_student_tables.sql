-- ============================================================
-- V3: Student domain tables
-- ============================================================

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE students
(
    id                    BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid                  VARCHAR(36)  NOT NULL UNIQUE,
    institute_id          BIGINT       NOT NULL REFERENCES institutes (id),
    student_number        VARCHAR(30)  NOT NULL,
    first_name            VARCHAR(100) NOT NULL,
    last_name             VARCHAR(100),
    email                 VARCHAR(255),
    phone                 VARCHAR(20)  NOT NULL,
    whatsapp_number       VARCHAR(20),
    date_of_birth         DATE,
    gender                VARCHAR(10),
    address               TEXT,
    city                  VARCHAR(100),
    state                 VARCHAR(100),
    pincode               VARCHAR(10),
    photo_url             VARCHAR(1000),
    parent_name           VARCHAR(200),
    parent_phone          VARCHAR(20),
    parent_email          VARCHAR(255),
    emergency_contact     VARCHAR(20),
    highest_qualification VARCHAR(200),
    school_college_name   VARCHAR(300),
    status                VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    lead_id               BIGINT,
    notes                 TEXT,
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by            BIGINT,
    updated_by            BIGINT,
    deleted_at            TIMESTAMP,
    CONSTRAINT uq_students_number_institute UNIQUE (student_number, institute_id)
);

-- INDEX idx_students_institute_status covers most list/filter queries
CREATE INDEX idx_students_phone            ON students (phone);
CREATE INDEX idx_students_email            ON students (email);
CREATE INDEX idx_students_institute_status ON students (institute_id, status, deleted_at);
CREATE INDEX idx_students_lead             ON students (lead_id);

CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- STUDENT DOCUMENTS
-- ============================================================
CREATE TABLE student_documents
(
    id              BIGINT        NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id      BIGINT        NOT NULL REFERENCES students (id) ON DELETE CASCADE,
    admission_id    BIGINT,
    document_type   VARCHAR(50)   NOT NULL,
    file_name       VARCHAR(500)  NOT NULL,
    file_url        VARCHAR(1000) NOT NULL,
    file_size_bytes BIGINT,
    mime_type       VARCHAR(100),
    is_verified     BOOLEAN       NOT NULL DEFAULT FALSE,
    verified_by     BIGINT,
    verified_at     TIMESTAMP,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      BIGINT,
    updated_by      BIGINT,
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_student_docs_student ON student_documents (student_id);
CREATE INDEX idx_student_docs_type    ON student_documents (document_type);

CREATE TRIGGER trg_student_documents_updated_at
    BEFORE UPDATE ON student_documents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
