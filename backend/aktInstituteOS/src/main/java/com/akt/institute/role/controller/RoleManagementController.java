package com.akt.institute.role.controller;

import com.akt.institute.role.dto.*;
import com.akt.institute.role.service.RoleManagementService;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Role Management", description = "RBAC — create, update, delete roles and manage permissions")
@SecurityRequirement(name = "bearerAuth")
public class RoleManagementController {

    private final RoleManagementService roleService;

    // ── Roles ─────────────────────────────────────────────────────────────

    @GetMapping("/api/v1/roles")
    @PreAuthorize("hasAuthority('ROLE_VIEW')")
    @Operation(summary = "List all roles for this institute with permission details and user count")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> list(@AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(roleService.list(p.getInstituteId())));
    }

    @GetMapping("/api/v1/roles/{id}")
    @PreAuthorize("hasAuthority('ROLE_VIEW')")
    @Operation(summary = "Get role by ID with full permissions")
    public ResponseEntity<ApiResponse<RoleResponse>> get(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(roleService.get(id, p.getInstituteId())));
    }

    @PostMapping("/api/v1/roles")
    @PreAuthorize("hasAuthority('ROLE_CREATE')")
    @Operation(summary = "Create a new role and optionally assign permissions")
    public ResponseEntity<ApiResponse<RoleResponse>> create(
            @Valid @RequestBody RoleRequest req, @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        RoleResponse res = roleService.create(req, p.getInstituteId(), p.getId(), ip(http), http.getHeader("User-Agent"));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created("Role created", res));
    }

    @PutMapping("/api/v1/roles/{id}")
    @PreAuthorize("hasAuthority('ROLE_UPDATE')")
    @Operation(summary = "Update role details")
    public ResponseEntity<ApiResponse<RoleResponse>> update(
            @PathVariable Long id, @Valid @RequestBody RoleRequest req,
            @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ResponseEntity.ok(ApiResponse.ok("Role updated",
                roleService.update(id, req, p.getInstituteId(), p.getId(), ip(http), http.getHeader("User-Agent"))));
    }

    @PutMapping("/api/v1/roles/{id}/permissions")
    @PreAuthorize("hasAuthority('ROLE_UPDATE')")
    @Operation(summary = "Replace all permissions assigned to a role")
    public ResponseEntity<ApiResponse<RoleResponse>> assignPermissions(
            @PathVariable Long id, @Valid @RequestBody AssignPermissionsRequest req,
            @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ResponseEntity.ok(ApiResponse.ok("Permissions updated",
                roleService.assignPermissions(id, req, p.getInstituteId(), p.getId(), ip(http), http.getHeader("User-Agent"))));
    }

    @DeleteMapping("/api/v1/roles/{id}")
    @PreAuthorize("hasAuthority('ROLE_DELETE')")
    @Operation(summary = "Delete a non-system role (must have no assigned users)")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id, @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        roleService.delete(id, p.getInstituteId(), p.getId(), ip(http), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.message("Role deleted"));
    }

    // ── Permissions (read-only reference) ────────────────────────────────

    @GetMapping("/api/v1/permissions")
    @PreAuthorize("hasAuthority('ROLE_VIEW')")
    @Operation(summary = "List all available permissions grouped by resource")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> allPermissions() {
        return ResponseEntity.ok(ApiResponse.ok(roleService.allPermissions()));
    }

    private String ip(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isBlank()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
