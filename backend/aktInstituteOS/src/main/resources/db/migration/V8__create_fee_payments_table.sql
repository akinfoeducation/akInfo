-- ── Fee payments ──────────────────────────────────────────────────────────
CREATE TABLE fee_payments (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid             VARCHAR(36)    NOT NULL UNIQUE,
    receipt_number   VARCHAR(30)    NOT NULL,
    institute_id     BIGINT         NOT NULL REFERENCES institutes(id),
    admission_id     BIGINT         NOT NULL REFERENCES admissions(id),
    amount           NUMERIC(12, 2) NOT NULL,
    payment_date     DATE           NOT NULL DEFAULT CURRENT_DATE,
    payment_mode     VARCHAR(30)    NOT NULL DEFAULT 'CASH',
    reference_number VARCHAR(100),
    notes            TEXT,
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP,
    created_by       BIGINT         REFERENCES users(id),
    updated_by       BIGINT         REFERENCES users(id),
    CONSTRAINT uq_receipt_number_institute UNIQUE (receipt_number, institute_id)
);

CREATE INDEX idx_fee_payments_institute_id  ON fee_payments(institute_id);
CREATE INDEX idx_fee_payments_admission_id  ON fee_payments(admission_id);
CREATE INDEX idx_fee_payments_payment_date  ON fee_payments(payment_date);
CREATE INDEX idx_fee_payments_payment_mode  ON fee_payments(payment_mode);
CREATE INDEX idx_fee_payments_deleted_at    ON fee_payments(deleted_at);

CREATE TRIGGER trg_fee_payments_updated_at
    BEFORE UPDATE ON fee_payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Fee permissions ───────────────────────────────────────────────────────
INSERT INTO permissions (name, code, resource, action, description)
VALUES
    ('View Fees',    'FEE_VIEW',    'FEE', 'READ',   'View fee payments and summary'),
    ('Collect Fees', 'FEE_COLLECT', 'FEE', 'CREATE', 'Record fee payments'),
    ('Delete Fees',  'FEE_DELETE',  'FEE', 'DELETE', 'Cancel/delete a fee payment')
ON CONFLICT (code) DO NOTHING;

-- ── Grant to SUPER_ADMIN ──────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'SUPER_ADMIN'
  AND  p.resource = 'FEE'
  AND  r.institute_id = 1
ON CONFLICT DO NOTHING;
