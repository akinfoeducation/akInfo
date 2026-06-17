-- ============================================================
-- V28: NOT_CONNECTED Retry Pool, Branch Transfer, Same-Number Routing
-- NOTE: branches table already exists (owned by the branch module).
--       We only add columns, seed data, and new tables here.
-- ============================================================

-- 1. Add NOT_CONNECTED tracking columns to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS not_connected_at   TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS previous_caller_id BIGINT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS branch_id          BIGINT;

-- 2. Seed Patna branch for every existing institute (branches table already exists)
--    Must include uuid (NOT NULL in the existing schema).
INSERT INTO branches (uuid, institute_id, name, code)
SELECT gen_random_uuid()::TEXT, id, 'Patna Branch', 'PATNA'
FROM   institutes
ON CONFLICT (institute_id, code) DO NOTHING;

-- 3. Lead transfers history table
CREATE TABLE IF NOT EXISTS lead_transfers (
    id              BIGSERIAL    PRIMARY KEY,
    lead_id         BIGINT       NOT NULL REFERENCES leads(id),
    institute_id    BIGINT       NOT NULL,
    transfer_type   VARCHAR(30)  NOT NULL,   -- BRANCH_TRANSFER | POOL_CLAIM | REASSIGN
    from_caller_id  BIGINT,
    to_caller_id    BIGINT,
    to_branch_id    BIGINT       REFERENCES branches(id),
    notes           TEXT,
    transferred_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    transferred_by  BIGINT       NOT NULL
);

-- 4. Index for retry pool query
--    Finds NOT_CONNECTED leads where not_connected_at < NOW() - 30 min
CREATE INDEX IF NOT EXISTS idx_leads_retry_pool
    ON leads(institute_id, not_connected_at)
    WHERE status = 'NOT_CONNECTED' AND deleted_at IS NULL;

-- 5. Index for same-number routing (find previous caller by phone)
CREATE INDEX IF NOT EXISTS idx_leads_phone_prev_caller
    ON leads(institute_id, phone, previous_caller_id, updated_at)
    WHERE deleted_at IS NULL;

-- 6. Lead transfers lookup per lead
CREATE INDEX IF NOT EXISTS idx_lead_transfers_lead
    ON lead_transfers(lead_id, transferred_at DESC);
