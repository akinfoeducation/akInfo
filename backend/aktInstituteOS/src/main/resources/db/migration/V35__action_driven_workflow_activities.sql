-- ============================================================
-- V35: Action-Driven Workflow — Enrich lead_activities
--
--   1. Add action_category  — coarse grouping (CALL, STATUS, HANDOFF, SYSTEM, ADMIN_OVERRIDE)
--   2. Add outcome          — call/action result (REACHED, NOT_CONNECTED, INTERESTED, etc.)
--   3. Add metadata         — JSONB for action-specific structured data
--                             e.g. { "visitDate": "2026-06-10", "reason": "fee too high" }
--   4. Add lead_action      — the named action that triggered this entry (matches LeadAction enum)
--   5. Index for outcome-based reporting (caller effectiveness dashboards)
-- ============================================================

ALTER TABLE lead_activities
    ADD COLUMN IF NOT EXISTS lead_action      VARCHAR(60),
    ADD COLUMN IF NOT EXISTS action_category  VARCHAR(30),
    ADD COLUMN IF NOT EXISTS outcome          VARCHAR(60),
    ADD COLUMN IF NOT EXISTS metadata         JSONB;

-- Backfill action_category for existing records based on action_type
UPDATE lead_activities SET action_category = CASE
    WHEN action_type IN ('ASSIGNED', 'REASSIGNED', 'UNASSIGNED')
        THEN 'ASSIGNMENT'
    WHEN action_type IN ('COUNSELLOR_HANDOFF', 'WALK_IN_CLAIM', 'COUNSELLOR_REASSIGNED')
        THEN 'HANDOFF'
    WHEN action_type IN ('BRANCH_TRANSFER', 'POOL_CLAIMED')
        THEN 'TRANSFER'
    WHEN action_type = 'NOT_CONNECTED'
        THEN 'CALL'
    WHEN action_type = 'STATUS_CHANGED'
        THEN 'STATUS'
    ELSE 'SYSTEM'
END
WHERE action_category IS NULL;

-- Index for reporting: "how many CALL outcomes per caller this month?"
CREATE INDEX IF NOT EXISTS idx_lead_activities_category
    ON lead_activities(institute_id, action_category, created_at)
    WHERE action_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_activities_action
    ON lead_activities(institute_id, lead_action, created_at)
    WHERE lead_action IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_activities_performer_category
    ON lead_activities(performed_by, action_category, created_at);
