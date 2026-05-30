-- ============================================================
-- V16: Rename Institute #1 to AKT Institute Delhi
--      V2 seeded it as 'AKT Info Institute' — correcting to
--      match the two-institute naming convention (Delhi / Patna)
-- ============================================================
UPDATE institutes
SET name = 'AKT Institute Delhi',
    code = 'AKT-DEL'
WHERE id = 1;
