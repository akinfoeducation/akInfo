-- ─────────────────────────────────────────────────────────────────────────────
-- Production duplicate-lead cleanup (ops script)
--
-- Context: migration V41 adds a partial UNIQUE index on active leads
-- (institute_id, phone). If the table already holds >1 ACTIVE lead for the same
-- number, that index cannot be built. V41 now performs the same dedup
-- automatically (backfill step) before creating the index, so on a normal deploy
-- you do NOT need to run this by hand.
--
-- Keep this script for: (a) inspecting prod BEFORE deploy, and (b) ad-hoc cleanup
-- if you ever want to resolve duplicates outside a migration.
--
-- "Active" = not soft-deleted AND status not in (NOT_INTERESTED, NOT_REACHABLE,
-- CLOSED). Dead/closed numbers are allowed to repeat (same-number routing, C9).
--
-- Run against the prod DB, e.g. on the VPS:
--   docker exec -i akt-postgres sh -c \
--     'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' \
--     < scripts/prod_duplicate_lead_cleanup.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) DETECT — duplicate active leads per number (expect 0 rows on a clean DB).
SELECT institute_id, phone, COUNT(*) AS active_rows
FROM   leads
WHERE  deleted_at IS NULL
  AND  status NOT IN ('NOT_INTERESTED', 'NOT_REACHABLE', 'CLOSED')
GROUP  BY institute_id, phone
HAVING COUNT(*) > 1
ORDER  BY active_rows DESC;

-- 2) CLEANUP — keep the most-recently-updated active lead per number, soft-delete
--    the older duplicates. Reversible (clear deleted_at). No-op when none exist.
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

-- 3) VERIFY — should return 0 rows after cleanup.
SELECT institute_id, phone, COUNT(*) AS active_rows
FROM   leads
WHERE  deleted_at IS NULL
  AND  status NOT IN ('NOT_INTERESTED', 'NOT_REACHABLE', 'CLOSED')
GROUP  BY institute_id, phone
HAVING COUNT(*) > 1;
