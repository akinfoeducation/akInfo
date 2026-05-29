package com.akt.institute.lead.controller;

import com.akt.institute.lead.dto.*;
import com.akt.institute.lead.service.LeadService;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/leads")
@RequiredArgsConstructor
@Tag(name = "Leads", description = "Lead / inquiry management and conversion")
@SecurityRequirement(name = "bearerAuth")
public class LeadController {

    private final LeadService leadService;

    // ── List ────────────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('LEAD_VIEW')")
    @Operation(summary = "List leads with optional status/source filter and search")
    public ResponseEntity<ApiResponse<List<LeadSummaryResponse>>> list(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String source,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "0")    int page,
        @RequestParam(defaultValue = "20")   int size,
        @RequestParam(defaultValue = "createdAt") String sort,
        @RequestParam(defaultValue = "desc") String dir
    ) {
        size = Math.min(size, 100);
        return ResponseEntity.ok(
            leadService.list(principal.getInstituteId(), status, source, q, page, size, sort, dir));
    }

    // ── Create ──────────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAuthority('LEAD_CREATE')")
    @Operation(summary = "Create a new lead / inquiry")
    public ResponseEntity<ApiResponse<LeadResponse>> create(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CreateLeadRequest request
    ) {
        var lead = leadService.create(request, principal.getInstituteId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created("Lead created successfully", lead));
    }

    // ── Get by ID ───────────────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('LEAD_VIEW')")
    @Operation(summary = "Get lead detail by ID")
    public ResponseEntity<ApiResponse<LeadResponse>> getById(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(leadService.getById(id, principal.getInstituteId())));
    }

    // ── Update ──────────────────────────────────────────────────────────────

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('LEAD_UPDATE')")
    @Operation(summary = "Update lead profile (name, phone, email, course, notes)")
    public ResponseEntity<ApiResponse<LeadResponse>> update(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody UpdateLeadRequest request
    ) {
        var lead = leadService.update(id, request, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Lead updated successfully", lead));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('LEAD_UPDATE')")
    @Operation(summary = "Update lead status (NEW, CONTACTED, FOLLOW_UP, DEMO_SCHEDULED, NEGOTIATION, LOST)")
    public ResponseEntity<ApiResponse<LeadResponse>> updateStatus(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody UpdateLeadStatusRequest request
    ) {
        var lead = leadService.updateStatus(id, request, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Lead status updated", lead));
    }

    // ── Convert ─────────────────────────────────────────────────────────────

    @PostMapping("/{id}/convert")
    @PreAuthorize("hasAuthority('LEAD_CONVERT')")
    @Operation(summary = "Mark lead as CONVERTED — triggers admission creation flow")
    public ResponseEntity<ApiResponse<LeadResponse>> convert(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        var lead = leadService.convert(id, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Lead converted successfully", lead));
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
}
