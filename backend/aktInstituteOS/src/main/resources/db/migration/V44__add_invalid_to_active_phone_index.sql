-- ─────────────────────────────────────────────────────────────────────────────
-- INVALID is a new dead/terminal status (wrong number / fake / unusable contact).
-- It joins NOT_INTERESTED, NOT_REACHABLE and CLOSED as a state that does NOT block
-- a returning number — so it must also be excluded from the "one active lead per
-- (institute_id, phone)" unique index. Otherwise an invalid lead would keep its
-- number locked in the active index even though the application treats it as dead.
--
-- Recreate the partial unique index with INVALID added to the excluded set.
-- ─────────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS uq_leads_active_phone;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_active_phone
    ON leads (institute_id, phone)
    WHERE deleted_at IS NULL
      AND status NOT IN ('NOT_INTERESTED', 'NOT_REACHABLE', 'CLOSED', 'INVALID');
