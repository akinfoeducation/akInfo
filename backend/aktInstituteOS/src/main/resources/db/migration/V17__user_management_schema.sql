-- ============================================================
-- V17: User Management Module — Schema
--      - branches table
--      - departments table
--      - extend users table (professional fields)
--      - extend roles table (deleted_at for soft delete)
-- ============================================================

-- ── 1. BRANCHES ────────────────────────────────────────────────────────────
CREATE TABLE branches (
    id           BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid         VARCHAR(36)  NOT NULL UNIQUE,
    institute_id BIGINT       NOT NULL REFERENCES institutes (id),
    name         VARCHAR(200) NOT NULL,
    code         VARCHAR(50)  NOT NULL,
    address      TEXT,
    city         VARCHAR(100),
    phone        VARCHAR(20),
    email        VARCHAR(255),
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by   BIGINT,
    updated_by   BIGINT,
    deleted_at   TIMESTAMPTZ,
    CONSTRAINT uq_branch_code_institute UNIQUE (code, institute_id)
);

CREATE INDEX idx_branches_institute ON branches (institute_id);

CREATE TRIGGER trg_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. DEPARTMENTS ─────────────────────────────────────────────────────────
CREATE TABLE departments (
    id           BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid         VARCHAR(36)  NOT NULL UNIQUE,
    institute_id BIGINT       NOT NULL REFERENCES institutes (id),
    name         VARCHAR(200) NOT NULL,
    code         VARCHAR(50)  NOT NULL,
    description  TEXT,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by   BIGINT,
    updated_by   BIGINT,
    deleted_at   TIMESTAMPTZ,
    CONSTRAINT uq_dept_code_institute UNIQUE (code, institute_id)
);

CREATE INDEX idx_departments_institute ON departments (institute_id);

CREATE TRIGGER trg_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 3. EXTEND USERS — professional profile fields ──────────────────────────
ALTER TABLE users
    ADD COLUMN employee_id   VARCHAR(50),
    ADD COLUMN branch_id     BIGINT REFERENCES branches (id),
    ADD COLUMN department_id BIGINT REFERENCES departments (id),
    ADD COLUMN designation   VARCHAR(200),
    ADD COLUMN gender        VARCHAR(10),       -- MALE | FEMALE | OTHER
    ADD COLUMN date_of_birth DATE,
    ADD COLUMN joining_date  DATE,
    ADD COLUMN address       TEXT;

CREATE UNIQUE INDEX idx_users_employee_institute
    ON users (employee_id, institute_id)
    WHERE employee_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_users_branch     ON users (branch_id);
CREATE INDEX idx_users_department ON users (department_id);

-- ── 4. EXTEND ROLES — soft delete support ──────────────────────────────────
ALTER TABLE roles ADD COLUMN deleted_at TIMESTAMPTZ;

-- ── 5. SEED DEFAULT BRANCHES ───────────────────────────────────────────────
INSERT INTO branches (uuid, institute_id, name, code, city, is_active)
VALUES
    (gen_random_uuid()::text, 1, 'AKT Institute Delhi - Main', 'DEL-MAIN', 'Delhi', TRUE),
    (gen_random_uuid()::text, 2, 'AKT Institute Patna - Main', 'PAT-MAIN', 'Patna', TRUE);

-- ── 6. SEED DEFAULT DEPARTMENTS ────────────────────────────────────────────
INSERT INTO departments (uuid, institute_id, name, code, description, is_active)
VALUES
    (gen_random_uuid()::text, 1, 'Academic',     'ACADEMIC',     'Academic faculty and coordination', TRUE),
    (gen_random_uuid()::text, 1, 'Administration','ADMIN',        'Administrative and operations staff', TRUE),
    (gen_random_uuid()::text, 1, 'Accounts',     'ACCOUNTS',     'Fee collection and financial operations', TRUE),
    (gen_random_uuid()::text, 2, 'Academic',     'ACADEMIC',     'Academic faculty and coordination', TRUE),
    (gen_random_uuid()::text, 2, 'Administration','ADMIN',        'Administrative and operations staff', TRUE),
    (gen_random_uuid()::text, 2, 'Accounts',     'ACCOUNTS',     'Fee collection and financial operations', TRUE);
