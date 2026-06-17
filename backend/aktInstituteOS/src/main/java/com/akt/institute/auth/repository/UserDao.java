package com.akt.institute.auth.repository;

import com.akt.institute.auth.domain.User;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface UserDao {

    // ── Auth lookups ──────────────────────────────────────────────────────
    Optional<User> findById(Long id);

    Optional<User> findByEmailOrUsernameAndInstituteId(String identifier, Long instituteId);

    Optional<User> findByEmailAndInstituteId(String email, Long instituteId);

    Optional<User> findByUsernameAndInstituteId(String username, Long instituteId);

    boolean existsByEmailAndInstituteId(String email, Long instituteId);

    boolean existsByUsernameAndInstituteId(String username, Long instituteId);

    boolean existsByEmployeeIdAndInstituteId(String employeeId, Long instituteId);

    User save(User user);

    // ── User Management ───────────────────────────────────────────────────

    /** Paginated list with optional filters. Returns lightweight user rows. */
    List<User> findAll(Long instituteId, Long branchId, Long departmentId,
                       String roleCode, String status, String q,
                       int offset, int limit, String sort, String dir);

    long count(Long instituteId, Long branchId, Long departmentId,
               String roleCode, String status, String q);

    /** Soft-delete a user. */
    void softDelete(Long id, Long deletedBy);

    /** Replace all roles for a user atomically. */
    void assignRoles(Long userId, Set<Long> roleIds);

    /** Remove all roles from a user. */
    void removeAllRoles(Long userId);
}
