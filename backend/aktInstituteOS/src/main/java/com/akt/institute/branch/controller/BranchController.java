package com.akt.institute.branch.controller;

import com.akt.institute.branch.dto.BranchRequest;
import com.akt.institute.branch.dto.BranchResponse;
import com.akt.institute.branch.service.BranchService;
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
@RequestMapping("/api/v1/branches")
@RequiredArgsConstructor
@Tag(name = "Branches", description = "Institute branch management")
@SecurityRequirement(name = "bearerAuth")
public class BranchController {

    private final BranchService branchService;

    @GetMapping
    @PreAuthorize("hasAuthority('BRANCH_VIEW')")
    @Operation(summary = "List all branches for the current institute")
    public ResponseEntity<ApiResponse<List<BranchResponse>>> list(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.list(principal.getInstituteId())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BRANCH_VIEW')")
    @Operation(summary = "Get branch details")
    public ResponseEntity<ApiResponse<BranchResponse>> get(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.get(id, principal.getInstituteId())));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BRANCH_MANAGE')")
    @Operation(summary = "Create a new branch")
    public ResponseEntity<ApiResponse<BranchResponse>> create(
            @Valid @RequestBody BranchRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest http) {
        var response = branchService.create(request, principal.getInstituteId(),
                principal.getId(), getIp(http), http.getHeader("User-Agent"));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Branch created successfully", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BRANCH_MANAGE')")
    @Operation(summary = "Update branch details")
    public ResponseEntity<ApiResponse<BranchResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody BranchRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest http) {
        var response = branchService.update(id, request, principal.getInstituteId(),
                principal.getId(), getIp(http), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok("Branch updated successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('BRANCH_MANAGE')")
    @Operation(summary = "Soft-delete a branch")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest http) {
        branchService.delete(id, principal.getInstituteId(),
                principal.getId(), getIp(http), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.message("Branch deleted successfully"));
    }

    private String getIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isBlank()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
