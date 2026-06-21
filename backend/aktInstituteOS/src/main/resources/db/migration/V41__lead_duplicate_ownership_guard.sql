-- ─────────────────────────────────────────────────────────────────────────────
-- P0 lead duplicate-prevention & ownership guards
--
-- (0) BACKFILL — resolve any pre-existing duplicate ACTIVE leads before adding the
--     uniqueness constraint below. Until now "one lead per phone" was enforced only
--     in application code, so a table may already contain >1 active lead for the
--     same (institute_id, phone) — and CREATE UNIQUE INDEX would fail on those.
--     We keep the most-recently-updated active lead per number and SOFT-DELETE the
--     older duplicates (deleted_at = now()). Nothing is hard-deleted; this is
--     reversible (clear deleted_at). On a clean database this updates zero rows.
--     This runs exactly once, atomically with the index creation below, so the
--     constraint can never fail to apply on deploy.
--
-- (1) DB-level uniqueness for ACTIVE leads. This makes the database the final
--     authority — closing the check-then-insert race where two concurrent creates
--     could both pass the SELECT and both INSERT — so at most one *active* lead per
--     (institute_id, phone) can exist at a time.
--
--     The predicate deliberately excludes dead/closed states
--     (NOT_INTERESTED, NOT_REACHABLE, CLOSED) so that same-number routing
--     (Scenario C9) still works — a returning dead number re-enters as a fresh
--     ACTIVE row while the old dead row remains, and only one active row exists.
--     ADMISSION_DONE is intentionally NOT excluded — an enrolled student keeps
--     blocking new active leads for that number.
--
-- (2) An index on whatsapp_number so the cross-field duplicate lookup
--     (primary OR alternate number) stays fast.
-- ─────────────────────────────────────────────────────────────────────────────

-- (0) Backfill: keep newest active lead per (institute_id, phone), soft-delete the rest.
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY institute_id, phone
               ORDER BY updated_at DESC NULLS LAST, id DESC
           ) AS rn
      FROM leads
     WHERE deleted_at IS NULL
       AND status NOT IN ('NOT_INTERESTED', 'NOT_REACHABLE', 'CLOSED')
)
UPDATE leads l
   SET deleted_at = now(),
       updated_at = now()
  FROM ranked r
 WHERE l.id = r.id
   AND r.rn > 1;

-- (1) One active lead per (institute_id, phone).
CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_active_phone
    ON leads (institute_id, phone)
    WHERE deleted_at IS NULL
      AND status NOT IN ('NOT_INTERESTED', 'NOT_REACHABLE', 'CLOSED');

-- (2) Keep the cross-field (primary OR alternate) duplicate lookup fast.
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_number
    ON leads (whatsapp_number)
    WHERE whatsapp_number IS NOT NULL AND deleted_at IS NULL;
