package com.akt.institute.user.controller;

import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import com.akt.institute.user.dto.*;
import com.akt.institute.user.service.UserManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "Enterprise user CRUD, status control, bulk operations")
@SecurityRequirement(name = "bearerAuth")
public class UserManagementController {

    private final UserManagementService userService;

    // ── List ──────────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('USER_VIEW')")
    @Operation(summary = "List users with filters, search and pagination")
    public ResponseEntity<ApiResponse<List<UserResponse>>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Long   branchId,
            @RequestParam(required = false) Long   departmentId,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0")   int    page,
            @RequestParam(defaultValue = "20")  int    size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc")      String dir
    ) {
        size = Math.min(size, 100);
        return ResponseEntity.ok(userService.list(
                principal.getInstituteId(), branchId, departmentId,
                role, status, q, page, size, sort, dir));
    }

    // ── Get ───────────────────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_VIEW')")
    @Operation(summary = "Get full user profile by ID")
    public ResponseEntity<ApiResponse<UserResponse>> get(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(userService.get(id, principal.getInstituteId())));
    }

    // ── Create ────────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAuthority('USER_CREATE')")
    @Operation(summary = "Create a new user and assign roles")
    public ResponseEntity<ApiResponse<UserResponse>> create(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest http) {
        UserResponse response = userService.create(
                request, principal.getInstituteId(), principal.getId(), ip(http), http.getHeader("User-Agent"));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("User created successfully", response));
    }

    // ── Update ────────────────────────────────────────────────────────────

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @Operation(summary = "Update user profile and optionally reassign roles")
    public ResponseEntity<ApiResponse<UserResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest http) {
        UserResponse response = userService.update(
                id, request, principal.getInstituteId(), principal.getId(), ip(http), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok("User updated successfully", response));
    }

    // ── Status ────────────────────────────────────────────────────────────

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @Operation(summary = "Activate or deactivate a user account")
    public ResponseEntity<ApiResponse<Void>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest http) {
        userService.updateStatus(id, request, principal.getInstituteId(),
                principal.getId(), ip(http), http.getHeader("User-Agent"));
        String msg = Boolean.TRUE.equals(request.getActive()) ? "User activated" : "User deactivated";
        return ResponseEntity.ok(ApiResponse.message(msg));
    }

    // ── Delete ────────────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_DELETE')")
    @Operation(summary = "Soft-delete a user and revoke all their sessions")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest http) {
        userService.delete(id, principal.getInstituteId(),
                principal.getId(), ip(http), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.message("User deleted successfully"));
    }

    // ── Admin Password Reset ──────────────────────────────────────────────

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @Operation(summary = "Admin resets a user's password and revokes all active sessions")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody AdminResetPasswordRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest http) {
        userService.adminResetPassword(id, request, principal.getInstituteId(),
                principal.getId(), ip(http), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.message("Password reset successfully. User must log in again."));
    }

    // ── Bulk Operations ───────────────────────────────────────────────────

    @PostMapping("/bulk")
    @PreAuthorize("hasAuthority('USER_BULK')")
    @Operation(summary = "Bulk activate, deactivate, assign role, or delete users")
    public ResponseEntity<ApiResponse<BulkOperationResult>> bulk(
            @Valid @RequestBody BulkOperationRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest http) {
        BulkOperationResult result = userService.bulkOperation(
                request, principal.getInstituteId(), principal.getId(), ip(http), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok("Bulk operation completed", result));
    }

    // ── Avatar Upload ─────────────────────────────────────────────────────

    @PostMapping(value = "/{id}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @Operation(summary = "Upload or replace user avatar (JPEG, PNG, WebP — max 10 MB)")
    public ResponseEntity<ApiResponse<UserResponse>> uploadAvatar(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest http) {
        UserResponse response = userService.uploadAvatar(
                id, file, principal.getInstituteId(), principal.getId(), ip(http), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok("Avatar uploaded", response));
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private String ip(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isBlank()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
