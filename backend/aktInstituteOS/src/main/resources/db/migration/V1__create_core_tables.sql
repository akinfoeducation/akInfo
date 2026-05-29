-- ============================================================
-- V1: Core tables — institutes, users, RBAC, tokens
-- ============================================================

-- Helper: auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- INSTITUTES
-- ============================================================
CREATE TABLE institutes
(
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid        VARCHAR(36)   NOT NULL UNIQUE,
    name        VARCHAR(255)  NOT NULL,
    code        VARCHAR(20)   NOT NULL UNIQUE,
    tagline     VARCHAR(500),
    address     TEXT,
    city        VARCHAR(100),
    state       VARCHAR(100),
    pincode     VARCHAR(10),
    phone       VARCHAR(20),
    email       VARCHAR(255),
    website_url VARCHAR(500),
    logo_url    VARCHAR(1000),
    favicon_url VARCHAR(1000),
    settings    JSONB,
    is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT,
    updated_by  BIGINT,
    deleted_at  TIMESTAMP
);

CREATE INDEX idx_institutes_code ON institutes (code);

CREATE TRIGGER trg_institutes_updated_at
    BEFORE UPDATE ON institutes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PERMISSIONS (define before roles)
-- ============================================================
CREATE TABLE permissions
(
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    code        VARCHAR(100) NOT NULL UNIQUE,
    resource    VARCHAR(50)  NOT NULL,
    action      VARCHAR(50)  NOT NULL,
    description VARCHAR(500)
);

CREATE INDEX idx_permissions_code ON permissions (code);
CREATE INDEX idx_permissions_resource ON permissions (resource);

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE roles
(
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institute_id BIGINT       NOT NULL REFERENCES institutes (id),
    name         VARCHAR(100) NOT NULL,
    code         VARCHAR(50)  NOT NULL,
    description  VARCHAR(500),
    is_system    BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by   BIGINT,
    updated_by   BIGINT,
    CONSTRAINT uq_roles_code_institute UNIQUE (code, institute_id)
);

CREATE INDEX idx_roles_institute ON roles (institute_id);

CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROLE ↔ PERMISSION JUNCTION
-- ============================================================
CREATE TABLE role_permissions
(
    role_id       BIGINT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users
(
    id                    BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid                  VARCHAR(36)  NOT NULL UNIQUE,
    institute_id          BIGINT       NOT NULL REFERENCES institutes (id),
    username              VARCHAR(100) NOT NULL,
    email                 VARCHAR(255) NOT NULL,
    password_hash         VARCHAR(255) NOT NULL,
    first_name            VARCHAR(100) NOT NULL,
    last_name             VARCHAR(100),
    phone                 VARCHAR(20),
    avatar_url            VARCHAR(1000),
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
    is_email_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    last_login_at         TIMESTAMP,
    password_changed_at   TIMESTAMP,
    failed_login_attempts INT          NOT NULL DEFAULT 0,
    locked_until          TIMESTAMP,
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by            BIGINT,
    updated_by            BIGINT,
    deleted_at            TIMESTAMP,
    CONSTRAINT uq_users_email_institute    UNIQUE (email, institute_id),
    CONSTRAINT uq_users_username_institute UNIQUE (username, institute_id)
);

CREATE INDEX idx_users_institute ON users (institute_id);
CREATE INDEX idx_users_phone    ON users (phone);
CREATE INDEX idx_users_deleted  ON users (deleted_at);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- USER ↔ ROLE JUNCTION
-- ============================================================
CREATE TABLE user_roles
(
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE refresh_tokens
(
    id            BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash    VARCHAR(255) NOT NULL UNIQUE,
    expires_at    TIMESTAMP    NOT NULL,
    is_revoked    BOOLEAN      NOT NULL DEFAULT FALSE,
    revoked_at    TIMESTAMP,
    revoke_reason VARCHAR(100),
    ip_address    VARCHAR(45),
    user_agent    VARCHAR(500),
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user    ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens (is_revoked);

-- ============================================================
-- PASSWORD RESET TOKENS
-- ============================================================
CREATE TABLE password_reset_tokens
(
    id         BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP    NOT NULL,
    is_used    BOOLEAN      NOT NULL DEFAULT FALSE,
    used_at    TIMESTAMP,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prt_user    ON password_reset_tokens (user_id);
CREATE INDEX idx_prt_expires ON password_reset_tokens (expires_at);

-- ============================================================
-- SEQUENCE COUNTERS (atomic ID generation)
-- ============================================================
CREATE TABLE sequence_counters
(
    id            BIGINT      NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institute_id  BIGINT      NOT NULL REFERENCES institutes (id),
    sequence_type VARCHAR(50) NOT NULL,
    year          INT         NOT NULL,
    current_value BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT uq_seq_institute_type_year UNIQUE (institute_id, sequence_type, year)
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs
(
    id           BIGINT        NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institute_id BIGINT,
    user_id      BIGINT,
    action       VARCHAR(100)  NOT NULL,
    entity_type  VARCHAR(50),
    entity_id    VARCHAR(100),
    old_values   JSONB,
    new_values   JSONB,
    ip_address   VARCHAR(45),
    user_agent   VARCHAR(1000),
    request_id   VARCHAR(36),
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user    ON audit_logs (user_id);
CREATE INDEX idx_audit_entity  ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs (created_at);
CREATE INDEX idx_audit_action  ON audit_logs (action);
-- No FKs on audit_logs intentionally: logs must survive entity deletion
