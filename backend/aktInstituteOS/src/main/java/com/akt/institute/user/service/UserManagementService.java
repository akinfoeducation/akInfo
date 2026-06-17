package com.akt.institute.user.service;

import com.akt.institute.audit.domain.AuditAction;
import com.akt.institute.audit.service.AuditService;
import com.akt.institute.auth.domain.Role;
import com.akt.institute.auth.domain.User;
import com.akt.institute.auth.repository.RefreshTokenDao;
import com.akt.institute.auth.repository.UserDao;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.dto.PageMeta;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.DuplicateResourceException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import com.akt.institute.shared.storage.FileStorageService;
import com.akt.institute.shared.util.SequenceGenerator;
import com.akt.institute.user.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserManagementService {

    private final UserDao            userDao;
    private final RefreshTokenDao    refreshTokenDao;
    private final PasswordEncoder    passwordEncoder;
    private final AuditService       auditService;
    private final SequenceGenerator  sequenceGenerator;
    private final FileStorageService fileStorageService;

    // ── List & Search ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ApiResponse<List<UserResponse>> list(
            Long instituteId, Long branchId, Long departmentId,
            String roleCode, String status, String q,
            int page, int size, String sort, String dir) {

        int offset = page * size;
        List<User> users = userDao.findAll(instituteId, branchId, departmentId,
                roleCode, status, q, offset, size, sort, dir);
        long total = userDao.count(instituteId, branchId, departmentId, roleCode, status, q);
        List<UserResponse> data = users.stream().map(this::toResponse).toList();
        return ApiResponse.paged(data, PageMeta.of(page, size, total));
    }

    // ── Get ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public UserResponse get(Long id, Long instituteId) {
        User user = findOrThrow(id, instituteId);
        return toResponse(user);
    }

    // ── Create ────────────────────────────────────────────────────────────

    @Transactional
    public UserResponse create(CreateUserRequest req, Long instituteId, Long actorId, String ip, String ua) {
        // Duplicate checks
        if (userDao.existsByEmailAndInstituteId(req.getEmail().toLowerCase(), instituteId))
            throw new DuplicateResourceException("Email '" + req.getEmail() + "' is already registered");
        if (userDao.existsByUsernameAndInstituteId(req.getUsername().toLowerCase(), instituteId))
            throw new DuplicateResourceException("Username '" + req.getUsername() + "' is already taken");
        if (req.getEmployeeId() != null && !req.getEmployeeId().isBlank() &&
                userDao.existsByEmployeeIdAndInstituteId(req.getEmployeeId(), instituteId))
            throw new DuplicateResourceException("Employee ID '" + req.getEmployeeId() + "' is already in use");

        // Auto-generate employee ID if not provided
        String empId = (req.getEmployeeId() != null && !req.getEmployeeId().isBlank())
                ? req.getEmployeeId()
                : sequenceGenerator.next(instituteId, SequenceGenerator.EMPLOYEE);

        User user = User.builder()
                .uuid(UUID.randomUUID().toString())
                .instituteId(instituteId)
                .username(req.getUsername().toLowerCase())
                .email(req.getEmail().toLowerCase())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .firstName(req.getFirstName().trim())
                .lastName(req.getLastName() != null ? req.getLastName().trim() : null)
                .phone(req.getPhone())
                .isActive(req.isActive())
                .isEmailVerified(false)
                .passwordChangedAt(Instant.now())
                .failedLoginAttempts(0)
                .employeeId(empId)
                .branchId(req.getBranchId())
                .departmentId(req.getDepartmentId())
                .designation(req.getDesignation())
                .gender(req.getGender())
                .dateOfBirth(req.getDateOfBirth())
                .joiningDate(req.getJoiningDate())
                .address(req.getAddress())
                .build();

        user = userDao.save(user);

        // Assign roles
        if (req.getRoleIds() != null && !req.getRoleIds().isEmpty()) {
            userDao.assignRoles(user.getId(), req.getRoleIds());
            user = findOrThrow(user.getId(), instituteId); // reload with roles
        }

        auditService.log(instituteId, actorId, AuditAction.USER_CREATED, "USER",
                String.valueOf(user.getId()), null, String.valueOf(user.getId()), ip, ua);
        log.info("User created: id={}, email={}, by={}", user.getId(), user.getEmail(), actorId);
        return toResponse(user);
    }

    // ── Update ────────────────────────────────────────────────────────────

    @Transactional
    public UserResponse update(Long id, UpdateUserRequest req, Long instituteId, Long actorId, String ip, String ua) {
        User user = findOrThrow(id, instituteId);

        // Email uniqueness check if changed
        if (req.getEmail() != null && !req.getEmail().equalsIgnoreCase(user.getEmail()) &&
                userDao.existsByEmailAndInstituteId(req.getEmail().toLowerCase(), instituteId))
            throw new DuplicateResourceException("Email '" + req.getEmail() + "' is already registered");

        // Employee ID uniqueness check if changed
        if (req.getEmployeeId() != null && !req.getEmployeeId().isBlank() &&
                !req.getEmployeeId().equals(user.getEmployeeId()) &&
                userDao.existsByEmployeeIdAndInstituteId(req.getEmployeeId(), instituteId))
            throw new DuplicateResourceException("Employee ID '" + req.getEmployeeId() + "' is already in use");

        user.setFirstName(req.getFirstName().trim());
        user.setLastName(req.getLastName() != null ? req.getLastName().trim() : null);
        if (req.getEmail()       != null) user.setEmail(req.getEmail().toLowerCase());
        if (req.getPhone()       != null) user.setPhone(req.getPhone());
        if (req.getEmployeeId()  != null) user.setEmployeeId(req.getEmployeeId());
        if (req.getDesignation() != null) user.setDesignation(req.getDesignation());
        if (req.getGender()      != null) user.setGender(req.getGender());
        if (req.getDateOfBirth() != null) user.setDateOfBirth(req.getDateOfBirth());
        if (req.getJoiningDate() != null) user.setJoiningDate(req.getJoiningDate());
        if (req.getAddress()     != null) user.setAddress(req.getAddress());
        user.setBranchId(req.getBranchId());
        user.setDepartmentId(req.getDepartmentId());

        userDao.save(user);

        if (req.getRoleIds() != null) {
            userDao.assignRoles(id, req.getRoleIds());
            auditService.log(instituteId, actorId, AuditAction.USER_ROLE_CHANGED, "USER",
                    String.valueOf(id), ip, ua);
        }

        auditService.log(instituteId, actorId, AuditAction.USER_UPDATED, "USER",
                String.valueOf(id), ip, ua);
        return toResponse(findOrThrow(id, instituteId));
    }

    // ── Status (activate / deactivate) ────────────────────────────────────

    @Transactional
    public void updateStatus(Long id, UpdateUserStatusRequest req, Long instituteId, Long actorId, String ip, String ua) {
        User user = findOrThrow(id, instituteId);
        if (user.getId().equals(actorId))
            throw new BusinessException("Cannot change your own account status", "SELF_STATUS_CHANGE", HttpStatus.BAD_REQUEST);

        user.setActive(req.getActive());
        userDao.save(user);

        // If deactivating — revoke all tokens
        if (Boolean.FALSE.equals(req.getActive())) {
            refreshTokenDao.revokeAllByUser(user, Instant.now(), "ACCOUNT_DEACTIVATED");
        }

        String action = req.getActive() ? AuditAction.USER_ACTIVATED : AuditAction.USER_DEACTIVATED;
        auditService.log(instituteId, actorId, action, "USER", String.valueOf(id), ip, ua);
    }

    // ── Soft Delete ───────────────────────────────────────────────────────

    @Transactional
    public void delete(Long id, Long instituteId, Long actorId, String ip, String ua) {
        User user = findOrThrow(id, instituteId);
        if (user.getId().equals(actorId))
            throw new BusinessException("Cannot delete your own account", "SELF_DELETE", HttpStatus.BAD_REQUEST);

        refreshTokenDao.revokeAllByUser(user, Instant.now(), "USER_DELETED");
        userDao.softDelete(id, actorId);
        auditService.log(instituteId, actorId, AuditAction.USER_DELETED, "USER", String.valueOf(id), ip, ua);
    }

    // ── Admin Password Reset ──────────────────────────────────────────────

    @Transactional
    public void adminResetPassword(Long id, AdminResetPasswordRequest req, Long instituteId, Long actorId, String ip, String ua) {
        User user = findOrThrow(id, instituteId);
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        user.setPasswordChangedAt(req.isForceChange() ? null : Instant.now()); // null triggers force-change on login
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userDao.save(user);
        // Revoke all existing sessions — user must log in fresh
        refreshTokenDao.revokeAllByUser(user, Instant.now(), "PASSWORD_RESET_BY_ADMIN");
        auditService.log(instituteId, actorId, AuditAction.USER_PASSWORD_RESET, "USER",
                String.valueOf(id), ip, ua);
    }

    // ── Bulk Operations ───────────────────────────────────────────────────

    @Transactional
    public BulkOperationResult bulkOperation(BulkOperationRequest req, Long instituteId, Long actorId, String ip, String ua) {
        if (req.getOperation() == BulkOperationRequest.Operation.ASSIGN_ROLE && req.getRoleId() == null)
            throw new BusinessException("roleId is required for ASSIGN_ROLE operation", "MISSING_ROLE_ID", HttpStatus.BAD_REQUEST);

        List<String> errors = new ArrayList<>();
        int succeeded = 0;

        for (Long userId : req.getUserIds()) {
            try {
                switch (req.getOperation()) {
                    case ACTIVATE -> {
                        User u = findOrThrow(userId, instituteId);
                        u.setActive(true); userDao.save(u);
                        auditService.log(instituteId, actorId, AuditAction.USER_ACTIVATED, "USER", String.valueOf(userId), ip, ua);
                    }
                    case DEACTIVATE -> {
                        User u = findOrThrow(userId, instituteId);
                        u.setActive(false); userDao.save(u);
                        refreshTokenDao.revokeAllByUser(u, Instant.now(), "BULK_DEACTIVATE");
                        auditService.log(instituteId, actorId, AuditAction.USER_DEACTIVATED, "USER", String.valueOf(userId), ip, ua);
                    }
                    case ASSIGN_ROLE -> {
                        findOrThrow(userId, instituteId); // verify ownership
                        userDao.assignRoles(userId, Set.of(req.getRoleId()));
                        auditService.log(instituteId, actorId, AuditAction.USER_ROLE_CHANGED, "USER", String.valueOf(userId), ip, ua);
                    }
                    case DELETE -> {
                        User u = findOrThrow(userId, instituteId);
                        if (!u.getId().equals(actorId)) {
                            refreshTokenDao.revokeAllByUser(u, Instant.now(), "BULK_DELETE");
                            userDao.softDelete(userId, actorId);
                            auditService.log(instituteId, actorId, AuditAction.USER_DELETED, "USER", String.valueOf(userId), ip, ua);
                        } else {
                            errors.add("User " + userId + ": cannot delete your own account");
                            continue;
                        }
                    }
                }
                succeeded++;
            } catch (Exception ex) {
                errors.add("User " + userId + ": " + ex.getMessage());
                log.warn("Bulk op failed for userId={}: {}", userId, ex.getMessage());
            }
        }

        return BulkOperationResult.builder()
                .totalRequested(req.getUserIds().size())
                .succeeded(succeeded)
                .failed(errors.size())
                .errors(errors)
                .build();
    }

    // ── Avatar Upload ─────────────────────────────────────────────────────

    @Transactional
    public UserResponse uploadAvatar(Long id, MultipartFile file, Long instituteId, Long actorId, String ip, String ua) {
        User user = findOrThrow(id, instituteId);
        if (user.getAvatarUrl() != null) {
            fileStorageService.delete(user.getAvatarUrl());
        }
        var stored = fileStorageService.store(file, "users/avatars");
        user.setAvatarUrl(stored.url());
        user.setUpdatedAt(Instant.now());
        user.setUpdatedBy(actorId);
        userDao.save(user);
        auditService.log(instituteId, actorId, AuditAction.USER_UPDATED, "USER", String.valueOf(id),
                null, "{\"avatarUrl\":\"" + stored.url() + "\"}", ip, ua);
        return toResponse(user);
    }

    // ── private helpers ───────────────────────────────────────────────────

    private User findOrThrow(Long id, Long instituteId) {
        User user = userDao.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        // Tenant isolation — ensure user belongs to this institute
        if (!user.getInstituteId().equals(instituteId))
            throw new ResourceNotFoundException("User not found");
        if (user.isDeleted())
            throw new ResourceNotFoundException("User not found");
        return user;
    }

    public UserResponse toResponse(User u) {
        Set<UserResponse.RoleSummary> roles = u.getRoles().stream()
                .map(r -> UserResponse.RoleSummary.builder()
                        .id(r.getId()).name(r.getName()).code(r.getCode()).system(r.isSystem())
                        .build())
                .collect(Collectors.toSet());

        return UserResponse.builder()
                .id(u.getId()).uuid(u.getUuid()).instituteId(u.getInstituteId())
                .username(u.getUsername()).email(u.getEmail())
                .firstName(u.getFirstName()).lastName(u.getLastName()).fullName(u.getFullName())
                .phone(u.getPhone()).avatarUrl(u.getAvatarUrl())
                .employeeId(u.getEmployeeId()).designation(u.getDesignation())
                .gender(u.getGender()).dateOfBirth(u.getDateOfBirth()).joiningDate(u.getJoiningDate())
                .address(u.getAddress())
                .branchId(u.getBranchId()).departmentId(u.getDepartmentId())
                .roles(roles)
                .active(u.isActive()).emailVerified(u.isEmailVerified())
                .lastLoginAt(u.getLastLoginAt()).locked(u.isLocked())
                .failedLoginAttempts(u.getFailedLoginAttempts())
                .createdAt(u.getCreatedAt()).updatedAt(u.getUpdatedAt())
                .createdBy(u.getCreatedBy()).updatedBy(u.getUpdatedBy())
                .build();
    }
}
