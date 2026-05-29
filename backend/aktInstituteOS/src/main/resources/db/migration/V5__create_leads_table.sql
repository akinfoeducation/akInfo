-- ── Leads table ─────────────────────────────────────────────────────────────
CREATE TABLE leads (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid              VARCHAR(36)  NOT NULL UNIQUE,
    institute_id      BIGINT       NOT NULL REFERENCES institutes(id),
    first_name        VARCHAR(100) NOT NULL,
    last_name         VARCHAR(100),
    phone             VARCHAR(15)  NOT NULL,
    whatsapp_number   VARCHAR(15),
    email             VARCHAR(255),
    course_interested VARCHAR(200),
    source            VARCHAR(50)  NOT NULL DEFAULT 'WALK_IN',
    status            VARCHAR(50)  NOT NULL DEFAULT 'NEW',
    assigned_to_id    BIGINT REFERENCES users(id),
    notes             TEXT,
    next_follow_up_at TIMESTAMP,
    last_contacted_at TIMESTAMP,
    converted_at      TIMESTAMP,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at        TIMESTAMP,
    created_by        BIGINT REFERENCES users(id),
    updated_by        BIGINT REFERENCES users(id)
);

CREATE INDEX idx_leads_institute_id    ON leads(institute_id);
CREATE INDEX idx_leads_status          ON leads(status);
CREATE INDEX idx_leads_source          ON leads(source);
CREATE INDEX idx_leads_phone           ON leads(phone);
CREATE INDEX idx_leads_deleted_at      ON leads(deleted_at);
CREATE INDEX idx_leads_next_followup   ON leads(next_follow_up_at);
CREATE INDEX idx_leads_assigned_to     ON leads(assigned_to_id);

CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Lead permissions ─────────────────────────────────────────────────────────
INSERT INTO permissions (name, code, resource, action, description)
VALUES
    ('View Leads',    'LEAD_VIEW',    'LEAD', 'READ',   'View lead profiles and list'),
    ('Create Leads',  'LEAD_CREATE',  'LEAD', 'CREATE', 'Create new leads'),
    ('Update Leads',  'LEAD_UPDATE',  'LEAD', 'UPDATE', 'Edit lead profiles and status'),
    ('Delete Leads',  'LEAD_DELETE',  'LEAD', 'DELETE', 'Soft-delete leads'),
    ('Convert Lead',  'LEAD_CONVERT', 'LEAD', 'ACTION', 'Convert a lead to admission')
ON CONFLICT (code) DO NOTHING;

-- ── Grant all LEAD permissions to SUPER_ADMIN ────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'SUPER_ADMIN'
  AND  p.resource = 'LEAD'
  AND  r.institute_id = 1
ON CONFLICT DO NOTHING;
