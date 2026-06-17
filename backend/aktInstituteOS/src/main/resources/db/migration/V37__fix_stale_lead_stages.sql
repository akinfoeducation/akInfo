-- ============================================================
-- V37: Fix stale lead_stage values for leads already in
--      counsellor/admitted/dead states before V34 ran.
--
-- Root cause: handoffToCounsellor, handoffOnlineLead, and
-- claimAsWalkIn used custom SQL UPDATEs that set status but
-- did not set lead_stage. Those leads retained CALLER_PIPELINE
-- even after V34's backfill because V34 ran before these custom
-- SQL paths were patched in V37.
-- ============================================================

UPDATE leads SET lead_stage = 'COUNSELLOR_PIPELINE'
WHERE status IN (
    'VISIT_DONE',
    'FOLLOW_UP_AFTER_VISIT',
    'NEGOTIATION',
    'DOCUMENT_PENDING',
    'ADMISSION_IN_PROGRESS'
)
AND lead_stage != 'COUNSELLOR_PIPELINE'
AND deleted_at IS NULL;

UPDATE leads SET lead_stage = 'ADMITTED'
WHERE status = 'ADMISSION_DONE'
AND lead_stage != 'ADMITTED'
AND deleted_at IS NULL;

UPDATE leads SET lead_stage = 'DEAD'
WHERE status IN ('NOT_INTERESTED', 'NOT_REACHABLE', 'CLOSED')
AND lead_stage != 'DEAD'
AND deleted_at IS NULL;
