-- ── Expenses table ───────────────────────────────────────────────────────
CREATE TABLE expenses (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid             VARCHAR(36)    NOT NULL UNIQUE,
    institute_id     BIGINT         NOT NULL REFERENCES institutes(id),
    expense_number   VARCHAR(30)    NOT NULL,
    category         VARCHAR(100)   NOT NULL,   -- RENT, SALARY, UTILITIES, MARKETING, SUPPLIES, OTHER
    description      TEXT           NOT NULL,
    amount           NUMERIC(12, 2) NOT NULL,
    expense_date     DATE           NOT NULL DEFAULT CURRENT_DATE,
    paid_to          VARCHAR(200),
    payment_mode     VARCHAR(30)    NOT NULL DEFAULT 'CASH',
    reference_number VARCHAR(100),
    notes            TEXT,
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP,
    created_by       BIGINT         REFERENCES users(id),
    updated_by       BIGINT         REFERENCES users(id),
    CONSTRAINT uq_expense_number_institute UNIQUE (expense_number, institute_id)
);

CREATE INDEX idx_expenses_institute_id  ON expenses(institute_id);
CREATE INDEX idx_expenses_expense_date  ON expenses(expense_date);
CREATE INDEX idx_expenses_category      ON expenses(category);
CREATE INDEX idx_expenses_deleted_at    ON expenses(deleted_at);

CREATE TRIGGER trg_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Expense permissions ───────────────────────────────────────────────────
INSERT INTO permissions (name, code, resource, action, description)
VALUES
    ('View Expenses',   'EXPENSE_VIEW',   'EXPENSE', 'READ',   'View expense records'),
    ('Create Expenses', 'EXPENSE_CREATE', 'EXPENSE', 'CREATE', 'Record new expenses'),
    ('Update Expenses', 'EXPENSE_UPDATE', 'EXPENSE', 'UPDATE', 'Edit expense records'),
    ('Delete Expenses', 'EXPENSE_DELETE', 'EXPENSE', 'DELETE', 'Delete expense records')
ON CONFLICT (code) DO NOTHING;

-- ── Grant to SUPER_ADMIN ──────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'SUPER_ADMIN'
  AND  p.resource = 'EXPENSE'
  AND  r.institute_id = 1
ON CONFLICT DO NOTHING;
