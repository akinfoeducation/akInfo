package com.akt.institute.lead.controller;

import com.akt.institute.branch.dto.BranchResponse;
import com.akt.institute.lead.activity.dto.LeadActivityResponse;
import com.akt.institute.lead.dto.*;
import com.akt.institute.lead.service.LeadWorkflowService;
import com.akt.institute.lead.service.BranchTransferService;
import com.akt.institute.lead.service.CounsellorHandoffService;
import com.akt.institute.lead.service.LeadService;
import com.akt.institute.lead.service.RetryPoolService;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import java.time.LocalDate;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/leads")
@RequiredArgsConstructor
@Tag(name = "Leads", description = "Lead management and caller CRM workflow")
@SecurityRequirement(name = "bearerAuth")
public class LeadController {

    private final LeadService              leadService;
    private final RetryPoolService         retryPoolService;
    private final BranchTransferService    branchTransferService;
    private final CounsellorHandoffService counsellorHandoffService;
    private final LeadWorkflowService      leadWorkflowService;
    private final com.akt.institute.user.service.UserManagementService userManagementService;

    // ── List ────────────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('LEAD_VIEW')")
    @Operation(summary = "List leads — callers automatically see only their own assigned leads")
    public ResponseEntity<ApiResponse<List<LeadSummaryResponse>>> list(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String stage,
        @RequestParam(required = false) String source,
        @RequestParam(required = false) String q,
        @RequestParam(required = false) Long assignedToId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(defaultValue = "0")    int page,
        @RequestParam(defaultValue = "20")   int size,
        @RequestParam(defaultValue = "createdAt") String sort,
        @RequestParam(defaultValue = "desc") String dir
    ) {
        size = Math.min(size, 100);
        Long scopedCallerId = isCallerOnly(principal) ? principal.getId() : assignedToId;
        return ResponseEntity.ok(
            leadService.list(principal.getInstituteId(), status, stage, source, q, scopedCallerId, from, to, page, size, sort, dir));
    }

    // ── Create ──────────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAuthority('LEAD_CREATE')")
    @Operation(summary = "Create a new lead")
    public ResponseEntity<ApiResponse<LeadResponse>> create(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CreateLeadRequest request
    ) {
        var lead = leadService.create(request, principal.getInstituteId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created("Lead created successfully", lead));
    }

    // ── Bulk Import ─────────────────────────────────────────────────────────

    @PostMapping(value = "/bulk-import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('LEAD_IMPORT')")
    @Operation(summary = "Bulk import leads from Excel file (date + mobile columns)")
    public ResponseEntity<ApiResponse<BulkImportResult>> bulkImport(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam("file") MultipartFile file
    ) {
        var result = leadService.bulkImport(file, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Import complete", result));
    }

    // ── Duplicate lookup (real-time form check) ───────────────────────────────

    @GetMapping("/lookup")
    @PreAuthorize("hasAuthority('LEAD_VIEW')")
    @Operation(summary = "Check if a phone/alternate number already belongs to an active lead — backs the duplicate popup")
    public ResponseEntity<ApiResponse<LeadLookupResponse>> lookup(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam String phone
    ) {
        return ResponseEntity.ok(ApiResponse.ok(leadService.lookupByPhone(phone, principal.getInstituteId())));
    }

    // ── Get by ID ───────────────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('LEAD_VIEW')")
    @Operation(summary = "Get lead detail by ID")
    public ResponseEntity<ApiResponse<LeadResponse>> getById(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(leadService.getById(id, principal.getInstituteId(), principal)));
    }

    // ── Update ──────────────────────────────────────────────────────────────

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('LEAD_UPDATE')")
    @Operation(summary = "Update lead profile (name, phone, address, currentWork, interestedFor, notes)")
    public ResponseEntity<ApiResponse<LeadResponse>> update(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody UpdateLeadRequest request
    ) {
        var lead = leadService.update(id, request, principal.getInstituteId(), principal);
        return ResponseEntity.ok(ApiResponse.ok("Lead updated successfully", lead));
    }

    // ── Assign ──────────────────────────────────────────────────────────────

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAuthority('LEAD_ASSIGN')")
    @Operation(summary = "Assign or reassign a lead to a caller (Admin only)")
    public ResponseEntity<ApiResponse<LeadResponse>> assign(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody AssignLeadRequest request
    ) {
        var lead = leadService.assign(id, request.getCallerId(), principal.getInstituteId(), principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Lead assigned successfully", lead));
    }

    // ── Unassign ─────────────────────────────────────────────────────────────

    @PatchMapping("/{id}/unassign")
    @PreAuthorize("hasAuthority('LEAD_ASSIGN')")
    @Operation(summary = "Remove caller assignment from a lead (Admin only)")
    public ResponseEntity<ApiResponse<LeadResponse>> unassign(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        var lead = leadService.unassign(id, principal.getInstituteId(), principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Lead unassigned", lead));
    }

    // ── Bulk Assign ──────────────────────────────────────────────────────────

    @PostMapping("/bulk-assign")
    @PreAuthorize("hasAuthority('LEAD_ASSIGN')")
    @Operation(summary = "Bulk assign/reassign multiple leads to a caller (Admin only)")
    public ResponseEntity<ApiResponse<BulkAssignResult>> bulkAssign(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody BulkAssignRequest request
    ) {
        var result = leadService.bulkAssign(request, principal.getInstituteId(), principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Bulk assignment complete", result));
    }

    // ── Activity Timeline ────────────────────────────────────────────────────

    @GetMapping("/{id}/activities")
    @PreAuthorize("hasAuthority('LEAD_VIEW')")
    @Operation(summary = "Get activity timeline for a lead")
    public ResponseEntity<ApiResponse<List<LeadActivityResponse>>> activities(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(leadService.listActivities(id, principal.getInstituteId(), principal)));
    }

    // ── Delete ──────────────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('LEAD_DELETE')")
    @Operation(summary = "Soft-delete a lead")
    public ResponseEntity<ApiResponse<Void>> delete(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        leadService.delete(id, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.message("Lead deleted successfully"));
    }

    // ── Retry Pool ───────────────────────────────────────────────────────────
    // A lead enters the shared retry pool by being marked NOT_CONNECTED through the
    // guarded CALL_NOT_CONNECTED workflow action (POST /leads/{id}/actions), which
    // enforces ownership + caller-phase + ALLOWED_FROM. There is intentionally no
    // direct "mark not-connected" endpoint — that legacy backdoor was removed (C4).

    @GetMapping("/retry-pool")
    @PreAuthorize("hasAuthority('LEAD_VIEW')")
    @Operation(summary = "List leads in the shared retry pool (NOT_CONNECTED > 30 min old)")
    public ResponseEntity<ApiResponse<List<LeadSummaryResponse>>> retryPool(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(
            retryPoolService.listRetryPool(principal.getInstituteId(), page, size));
    }

    @PostMapping("/retry-pool/{id}/claim")
    @PreAuthorize("hasAuthority('LEAD_UPDATE')")
    @Operation(summary = "Atomically claim a lead from the retry pool — transfers ownership immediately")
    public ResponseEntity<ApiResponse<LeadResponse>> claimFromPool(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        var lead = retryPoolService.claimFromPool(id, principal.getId(), principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Lead claimed successfully", lead));
    }

    // ── Branch Transfer ──────────────────────────────────────────────────────

    @GetMapping("/branches")
    @PreAuthorize("hasAuthority('LEAD_VIEW')")
    @Operation(summary = "List available branches for transfer")
    public ResponseEntity<ApiResponse<List<BranchResponse>>> listBranches(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(
            ApiResponse.ok(branchTransferService.listBranches(principal.getInstituteId())));
    }

    @PostMapping("/{id}/transfer-branch")
    @PreAuthorize("hasAuthority('LEAD_UPDATE')")
    @Operation(summary = "Transfer lead to a branch — closes current caller ownership")
    public ResponseEntity<ApiResponse<LeadResponse>> transferBranch(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody TransferBranchRequest request
    ) {
        var lead = branchTransferService.transferToBranch(
            id, request, principal.getInstituteId(), principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Lead transferred to branch", lead));
    }

    @GetMapping("/{id}/transfers")
    @PreAuthorize("hasAuthority('LEAD_VIEW')")
    @Operation(summary = "Get transfer history for a lead (branch + pool claims + reassigns)")
    public ResponseEntity<ApiResponse<List<LeadTransferResponse>>> transferHistory(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        return ResponseEntity.ok(
            ApiResponse.ok(branchTransferService.getTransferHistory(id, principal.getInstituteId())));
    }

    // ── Counsellor list for handoff dropdown ────────────────────────────────
    // Separate from /api/v1/users (which requires USER_VIEW) so callers can
    // fetch the counsellor list without admin-level permissions.

    @GetMapping("/counsellors")
    @PreAuthorize("hasAuthority('COUNSELLOR_ASSIGN')")
    @Operation(summary = "List active counsellors for handoff dropdown — accessible to callers")
    public ResponseEntity<ApiResponse<List<com.akt.institute.user.dto.UserResponse>>> listCounsellors(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(
            userManagementService.list(
                principal.getInstituteId(), null, null,
                "COUNSELLOR", "active", null,
                0, 200, "firstName", "asc")
        );
    }

    // ── Counsellor Handoff (Fix 1 / Fix 4) ──────────────────────────────────

    @PostMapping("/{id}/handoff")
    @PreAuthorize("hasAuthority('COUNSELLOR_ASSIGN')")
    @Operation(summary = "Hand off lead to a counsellor after VISIT_DONE — transfers ownership from Caller to Counsellor")
    public ResponseEntity<ApiResponse<LeadResponse>> handoff(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody HandoffRequest request
    ) {
        var lead = counsellorHandoffService.handoffToCounsellor(
            id, request, principal.getInstituteId(), principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Lead handed off to counsellor", lead));
    }

    @PostMapping("/{id}/claim-walk-in")
    @PreAuthorize("hasAuthority('COUNSELLOR_ASSIGN')")
    @Operation(summary = "Counsellor self-claims a walk-in or direct lead (no prior caller involved)")
    public ResponseEntity<ApiResponse<LeadResponse>> claimWalkIn(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        var lead = counsellorHandoffService.claimWalkIn(
            id, principal.getId(), principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Walk-in lead claimed by counsellor", lead));
    }

    // ── Action-Driven Workflow ───────────────────────────────────────────────

    @GetMapping("/{id}/available-actions")
    @PreAuthorize("hasAuthority('LEAD_VIEW')")
    @Operation(summary = "Get available actions for a lead — context-aware button list for the UI")
    public ResponseEntity<ApiResponse<List<AvailableActionResponse>>> availableActions(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        var actions = leadWorkflowService.availableActions(id, principal.getInstituteId(), principal);
        return ResponseEntity.ok(ApiResponse.ok(actions));
    }

    @PostMapping("/{id}/actions")
    @PreAuthorize("hasAuthority('LEAD_PERFORM_ACTION')")
    @Operation(summary = "Perform a workflow action on a lead — drives status/stage transition automatically")
    public ResponseEntity<ApiResponse<LeadResponse>> performAction(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody LeadActionRequest request
    ) {
        var lead = leadWorkflowService.performAction(id, request, principal.getInstituteId(), principal);
        return ResponseEntity.ok(ApiResponse.ok("Action performed successfully", lead));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private boolean isCallerOnly(UserPrincipal principal) {
        return principal.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("LEAD_VIEW"))
            && principal.getAuthorities().stream()
            .noneMatch(a -> a.getAuthority().equals("LEAD_ASSIGN"));
    }
}
