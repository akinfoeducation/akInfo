-- ============================================================
-- V18: User Sessions — active session tracking
--      Each login creates a session record.
--      Logout/force-logout marks it inactive.
--      Linked to refresh_tokens via token_hash for revocation.
-- ============================================================

CREATE TABLE user_sessions (
    id             BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid           VARCHAR(36)  NOT NULL UNIQUE,
    user_id        BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    institute_id   BIGINT       NOT NULL REFERENCES institutes (id),
    token_hash     VARCHAR(255),                -- links to refresh_tokens.token_hash for revocation
    device_name    VARCHAR(200),
    device_type    VARCHAR(20)  NOT NULL DEFAULT 'WEB',  -- WEB | MOBILE | TABLET | UNKNOWN
    browser        VARCHAR(100),
    os             VARCHAR(100),
    ip_address     VARCHAR(45),
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    last_active_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at     TIMESTAMPTZ  NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user      ON user_sessions (user_id);
CREATE INDEX idx_sessions_institute ON user_sessions (institute_id);
CREATE INDEX idx_sessions_active    ON user_sessions (user_id, is_active);
CREATE INDEX idx_sessions_token     ON user_sessions (token_hash);
