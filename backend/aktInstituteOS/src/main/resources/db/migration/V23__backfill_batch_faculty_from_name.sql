-- =============================================================================
-- V23: Backfill batch_faculty from batches.faculty_name
--
-- Problem: Batches store faculty as a plain text column (faculty_name) with no
-- FK to users.  The batch_faculty M:M table (added in V20) was only partially
-- seeded.  As a result, faculty-scoped dashboard/batch/student queries that
-- join through batch_faculty return 0 rows for most faculty users.
--
-- Fix: For every batch whose faculty_name matches exactly one user in the same
-- institute (case-insensitive, trimmed), insert a PRIMARY batch_faculty record
-- if one does not already exist.
-- =============================================================================

INSERT INTO batch_faculty (
    institute_id,
    batch_id,
    faculty_user_id,
    subject,
    role,
    is_active,
    assigned_at,
    assigned_by
)
SELECT
    b.institute_id,
    b.id                                                          AS batch_id,
    u.id                                                          AS faculty_user_id,
    COALESCE(c.name, b.faculty_name, 'General')                  AS subject,
    'PRIMARY'                                                     AS role,
    TRUE                                                          AS is_active,
    CURRENT_TIMESTAMP                                             AS assigned_at,
    -- Use the lowest-id user in the same institute as the system assigner
    (SELECT id FROM users
      WHERE institute_id = b.institute_id
      ORDER BY id ASC
      LIMIT 1)                                                    AS assigned_by
FROM batches b
JOIN users u
    ON  u.institute_id = b.institute_id
    AND b.faculty_name IS NOT NULL
    AND b.faculty_name <> ''
    AND LOWER(TRIM(u.first_name || ' ' || COALESCE(u.last_name, '')))
        = LOWER(TRIM(b.faculty_name))
LEFT JOIN courses c ON c.id = b.course_id AND c.deleted_at IS NULL
WHERE b.deleted_at IS NULL
  AND NOT EXISTS (
        SELECT 1
          FROM batch_faculty bf
         WHERE bf.batch_id = b.id
           AND bf.faculty_user_id = u.id
      );
