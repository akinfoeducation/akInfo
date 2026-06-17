package com.akt.institute.lead.followup.controller;

import com.akt.institute.lead.followup.dto.CreateFollowUpRequest;
import com.akt.institute.lead.followup.dto.FollowUpResponse;
import com.akt.institute.lead.followup.service.FollowUpService;
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
@RequiredArgsConstructor
@Tag(name = "Follow-ups", description = "Follow-up scheduling for leads")
@SecurityRequirement(name = "bearerAuth")
public class FollowUpController {

    private final FollowUpService followUpService;

    @PostMapping("/api/v1/leads/{leadId}/follow-ups")
    @PreAuthorize("hasAuthority('FOLLOWUP_MANAGE')")
    @Operation(summary = "Schedule a follow-up for a lead")
    public ResponseEntity<ApiResponse<FollowUpResponse>> create(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long leadId,
        @Valid @RequestBody CreateFollowUpRequest request
    ) {
        boolean isAdmin = hasAssignPermission(principal);
        var result = followUpService.create(leadId, principal.getInstituteId(), principal.getId(), isAdmin, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created("Follow-up scheduled", result));
    }

    @GetMapping("/api/v1/leads/{leadId}/follow-ups")
    @PreAuthorize("hasAuthority('FOLLOWUP_VIEW')")
    @Operation(summary = "List follow-ups for a lead")
    public ResponseEntity<ApiResponse<List<FollowUpResponse>>> listForLead(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long leadId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(followUpService.listForLead(leadId, principal.getInstituteId())));
    }

    @GetMapping("/api/v1/follow-ups/pending")
    @PreAuthorize("hasAuthority('FOLLOWUP_VIEW')")
    @Operation(summary = "Get caller's pending follow-ups")
    public ResponseEntity<ApiResponse<List<FollowUpResponse>>> listPending(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(followUpService.listPending(principal.getId(), principal.getInstituteId())));
    }

    @PatchMapping("/api/v1/follow-ups/{id}/done")
    @PreAuthorize("hasAuthority('FOLLOWUP_MANAGE')")
    @Operation(summary = "Mark a follow-up as done")
    public ResponseEntity<ApiResponse<FollowUpResponse>> markDone(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        boolean isAdmin = hasAssignPermission(principal);
        return ResponseEntity.ok(ApiResponse.ok("Follow-up marked done",
            followUpService.markDone(id, principal.getInstituteId(), principal.getId(), isAdmin)));
    }

    private boolean hasAssignPermission(UserPrincipal p) {
        return p.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("LEAD_ASSIGN"));
    }
}
