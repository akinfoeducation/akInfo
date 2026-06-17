-- ============================================================
-- V34: Action-Driven Workflow — Phase 1
--
--   1. Add lead_stage column (CALLER_PIPELINE / COUNSELLOR_PIPELINE / ADMITTED / DEAD)
--   2. Backfill lead_stage from existing status values
--   3. Index for stage-based queries and dashboard tabs
-- ============================================================

-- ── 1. Add lead_stage column ─────────────────────────────────────────────────
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS lead_stage VARCHAR(30) NOT NULL DEFAULT 'CALLER_PIPELINE';

-- ── 2. Backfill lead_stage from existing status ──────────────────────────────
UPDATE leads SET lead_stage = CASE
    WHEN status = 'ADMISSION_DONE'
        THEN 'ADMITTED'
    WHEN status IN ('NOT_INTERESTED', 'NOT_REACHABLE', 'CLOSED')
        THEN 'DEAD'
    WHEN status IN (
        'VISIT_DONE', 'FOLLOW_UP_AFTER_VISIT', 'NEGOTIATION',
        'DOCUMENT_PENDING', 'ADMISSION_IN_PROGRESS'
    )
        THEN 'COUNSELLOR_PIPELINE'
    ELSE 'CALLER_PIPELINE'
END
WHERE deleted_at IS NULL;

-- Also update soft-deleted rows so the column is consistent
UPDATE leads SET lead_stage = CASE
    WHEN status = 'ADMISSION_DONE'
        THEN 'ADMITTED'
    WHEN status IN ('NOT_INTERESTED', 'NOT_REACHABLE', 'CLOSED')
        THEN 'DEAD'
    WHEN status IN (
        'VISIT_DONE', 'FOLLOW_UP_AFTER_VISIT', 'NEGOTIATION',
        'DOCUMENT_PENDING', 'ADMISSION_IN_PROGRESS'
    )
        THEN 'COUNSELLOR_PIPELINE'
    ELSE 'CALLER_PIPELINE'
END
WHERE deleted_at IS NOT NULL AND lead_stage = 'CALLER_PIPELINE';

-- ── 3. Indexes ────────────────────────────────────────────────────────────────
-- Stage tab queries: "show me all COUNSELLOR_PIPELINE leads"
CREATE INDEX IF NOT EXISTS idx_leads_stage
    ON leads(institute_id, lead_stage)
    WHERE deleted_at IS NULL;

-- Combined: stage + assigned_to for role-scoped dashboard tabs
CREATE INDEX IF NOT EXISTS idx_leads_stage_assigned
    ON leads(institute_id, lead_stage, assigned_to_id)
    WHERE deleted_at IS NULL;
