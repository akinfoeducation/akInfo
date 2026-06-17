-- =============================================================================
-- V22: Faculty RBAC corrections
--
-- Revokes BRANCH_VIEW and DEPT_VIEW from the FACULTY role across all institutes.
-- These were incorrectly granted in V19 to all non-student roles.
-- Faculty have no need to browse admin branch/department records.
-- Removing them also hides the entire "Administration" sidebar section for
-- faculty users since they will hold no administration-level permissions.
-- =============================================================================

DO $$
DECLARE
    v_inst_id   BIGINT;
    v_role_id   BIGINT;
    v_perm_id   BIGINT;
    v_perm_code TEXT;
    v_revoke    TEXT[] := ARRAY['BRANCH_VIEW', 'DEPT_VIEW'];
BEGIN
    FOR v_inst_id IN SELECT id FROM institutes LOOP

        SELECT id INTO v_role_id
          FROM roles
         WHERE institute_id = v_inst_id AND code = 'FACULTY'
         LIMIT 1;

        IF v_role_id IS NOT NULL THEN
            FOREACH v_perm_code IN ARRAY v_revoke LOOP
                SELECT id INTO v_perm_id
                  FROM permissions
                 WHERE code = v_perm_code;

                IF v_perm_id IS NOT NULL THEN
                    DELETE FROM role_permissions rp
                     WHERE rp.role_id = v_role_id
                       AND rp.permission_id = v_perm_id;
                END IF;
            END LOOP;
        END IF;

    END LOOP;
END $$;
