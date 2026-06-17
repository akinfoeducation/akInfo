package com.akt.institute.role.service;

import com.akt.institute.audit.domain.AuditAction;
import com.akt.institute.audit.service.AuditService;
import com.akt.institute.auth.domain.Permission;
import com.akt.institute.auth.domain.Role;
import com.akt.institute.role.dto.*;
import com.akt.institute.role.repository.RoleManagementDao;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.DuplicateResourceException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleManagementService {

    private final RoleManagementDao roleDao;
    private final AuditService      auditService;

    // ── List ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<RoleResponse> list(Long instituteId) {
        List<Role> roles = roleDao.findAllByInstituteId(instituteId);
        // One query for all counts — avoids N+1
        var counts = roleDao.countUsersPerRole(
                roles.stream().map(Role::getId).collect(java.util.stream.Collectors.toSet()));
        return roles.stream()
                .map(r -> toResponse(r, counts.getOrDefault(r.getId(), 0)))
                .toList();
    }

    // ── Get ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RoleResponse get(Long id, Long instituteId) {
        Role role = findOrThrow(id, instituteId);
        return toResponse(role, roleDao.countUsersWithRole(id));
    }

    // ── Create ────────────────────────────────────────────────────────────

    @Transactional
    public RoleResponse create(RoleRequest req, Long instituteId, Long actorId, String ip, String ua) {
        String code = req.getCode().toUpperCase();
        if (roleDao.existsByCodeAndInstituteId(code, instituteId))
            throw new DuplicateResourceException("Role code '" + code + "' already exists in this institute");

        Role role = new Role();
        role.setInstituteId(instituteId);
        role.setName(req.getName().trim());
        role.setCode(code);
        role.setDescription(req.getDescription());
        role.setSystem(false); // only seeded system roles are system
        role.setActive(req.isActive());
        role = roleDao.save(role);

        if (req.getPermissionIds() != null && !req.getPermissionIds().isEmpty())
            roleDao.assignPermissions(role.getId(), req.getPermissionIds());

        auditService.log(instituteId, actorId, AuditAction.ROLE_CREATED, "ROLE",
                String.valueOf(role.getId()), ip, ua);
        return toResponse(findOrThrow(role.getId(), instituteId), 0);
    }

    // ── Update ────────────────────────────────────────────────────────────

    @Transactional
    public RoleResponse update(Long id, RoleRequest req, Long instituteId, Long actorId, String ip, String ua) {
        Role role = findOrThrow(id, instituteId);
        if (role.isSystem())
            throw new BusinessException("System roles cannot be modified", "SYSTEM_ROLE", HttpStatus.FORBIDDEN);

        String newCode = req.getCode().toUpperCase();
        if (!newCode.equals(role.getCode()) && roleDao.existsByCodeAndInstituteId(newCode, instituteId))
            throw new DuplicateResourceException("Role code '" + newCode + "' already exists");

        role.setName(req.getName().trim());
        role.setCode(newCode);
        role.setDescription(req.getDescription());
        role.setActive(req.isActive());
        roleDao.save(role);

        if (req.getPermissionIds() != null) {
            roleDao.assignPermissions(id, req.getPermissionIds());
            auditService.log(instituteId, actorId, AuditAction.ROLE_PERMS_UPDATED, "ROLE",
                    String.valueOf(id), ip, ua);
        }

        auditService.log(instituteId, actorId, AuditAction.ROLE_UPDATED, "ROLE",
                String.valueOf(id), ip, ua);
        return toResponse(findOrThrow(id, instituteId), roleDao.countUsersWithRole(id));
    }

    // ── Assign Permissions ────────────────────────────────────────────────

    @Transactional
    public RoleResponse assignPermissions(Long id, AssignPermissionsRequest req, Long instituteId, Long actorId, String ip, String ua) {
        Role role = findOrThrow(id, instituteId);
        if (role.isSystem())
            throw new BusinessException("System role permissions cannot be modified via API",
                    "SYSTEM_ROLE", HttpStatus.FORBIDDEN);
        roleDao.assignPermissions(id, req.getPermissionIds());
        auditService.log(instituteId, actorId, AuditAction.ROLE_PERMS_UPDATED, "ROLE",
                String.valueOf(id), ip, ua);
        return toResponse(findOrThrow(id, instituteId), roleDao.countUsersWithRole(id));
    }

    // ── Delete ────────────────────────────────────────────────────────────

    @Transactional
    public void delete(Long id, Long instituteId, Long actorId, String ip, String ua) {
        Role role = findOrThrow(id, instituteId);
        if (role.isSystem())
            throw new BusinessException("System roles cannot be deleted", "SYSTEM_ROLE", HttpStatus.FORBIDDEN);
        if (roleDao.countUsersWithRole(id) > 0)
            throw new BusinessException("Cannot delete a role that is assigned to users. Reassign users first.",
                    "ROLE_IN_USE", HttpStatus.CONFLICT);
        roleDao.softDelete(id, actorId);
        auditService.log(instituteId, actorId, AuditAction.ROLE_DELETED, "ROLE",
                String.valueOf(id), ip, ua);
    }

    // ── All Permissions ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PermissionResponse> allPermissions() {
        return roleDao.findAllPermissions().stream().map(this::toPermResponse).toList();
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private Role findOrThrow(Long id, Long instituteId) {
        return roleDao.findByIdAndInstituteId(id, instituteId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
    }

    private RoleResponse toResponse(Role r, int userCount) {
        return RoleResponse.builder()
                .id(r.getId()).instituteId(r.getInstituteId())
                .name(r.getName()).code(r.getCode()).description(r.getDescription())
                .system(r.isSystem()).active(r.isActive())
                .permissions(r.getPermissions().stream().map(this::toPermResponse).collect(Collectors.toSet()))
                .userCount(userCount)
                .createdAt(r.getCreatedAt()).updatedAt(r.getUpdatedAt())
                .build();
    }

    private PermissionResponse toPermResponse(Permission p) {
        return PermissionResponse.builder()
                .id(p.getId()).name(p.getName()).code(p.getCode())
                .resource(p.getResource()).action(p.getAction()).description(p.getDescription())
                .build();
    }
}
