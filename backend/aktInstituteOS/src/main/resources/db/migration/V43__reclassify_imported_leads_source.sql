-- ─────────────────────────────────────────────────────────────────────────────
-- Reclassify historical bulk-imported leads: WALK_IN → IMPORTED.
--
-- Until now bulk import hardcoded source = WALK_IN, conflating ad/list imports
-- with genuine walk-in students and skewing the "leads by source" report.
-- Going forward, imports are tagged IMPORTED and a blank source defaults to
-- UNKNOWN; WALK_IN is reserved for real walk-ins.
--
-- Imported leads carry a distinctive signature: at import time the first_name was
-- set to the phone number (placeholder for the caller to fill in later). Relabel
-- those rows so reporting starts clean. Genuine walk-ins entered by staff have a
-- real name and keep WALK_IN.
--
-- Edge case: a genuine walk-in saved with no name would also match (first_name =
-- phone) and be relabelled IMPORTED — acceptable, as production usage is minimal
-- and this only affects the source breakdown, not any operational data.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE leads
   SET source = 'IMPORTED',
       updated_at = now()
 WHERE source = 'WALK_IN'
   AND first_name = phone;
