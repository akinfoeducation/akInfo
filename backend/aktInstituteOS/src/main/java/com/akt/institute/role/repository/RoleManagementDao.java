package com.akt.institute.role.repository;

import com.akt.institute.auth.domain.Permission;
import com.akt.institute.auth.domain.Role;

import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Role management DAO — full CRUD for roles and permission assignments.
 * Separate from auth.repository to keep concerns clean.
 */
public interface RoleManagementDao {

    List<Role>        findAllByInstituteId(Long instituteId);
    Optional<Role>    findByIdAndInstituteId(Long id, Long instituteId);
    boolean           existsByCodeAndInstituteId(String code, Long instituteId);
    Role              save(Role role);
    void              softDelete(Long id, Long deletedBy);
    void              assignPermissions(Long roleId, Set<Long> permissionIds);
    int               countUsersWithRole(Long roleId);

    /** Returns a map of roleId → userCount for all roles in one query. */
    java.util.Map<Long, Integer> countUsersPerRole(java.util.Set<Long> roleIds);
    List<Permission>  findAllPermissions();
}
