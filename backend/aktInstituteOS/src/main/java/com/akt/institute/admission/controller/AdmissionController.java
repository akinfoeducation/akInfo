package com.akt.institute.admission.controller;

import com.akt.institute.admission.dto.*;
import com.akt.institute.admission.service.AdmissionService;
import com.akt.institute.student.dto.CreateStudentRequest;
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
@RequestMapping("/api/v1/admissions")
@RequiredArgsConstructor
@Tag(name = "Admissions", description = "Admission enrollment management")
@SecurityRequirement(name = "bearerAuth")
public class AdmissionController {

    private final AdmissionService admissionService;

    // ── List ────────────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('ADMISSION_VIEW')")
    @Operation(summary = "List admissions with optional status filter and search")
    public ResponseEntity<ApiResponse<List<AdmissionSummaryResponse>>> list(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "0")    int page,
        @RequestParam(defaultValue = "20")   int size,
        @RequestParam(defaultValue = "createdAt") String sort,
        @RequestParam(defaultValue = "desc") String dir
    ) {
        size = Math.min(size, 100);
        return ResponseEntity.ok(
            admissionService.list(principal.getInstituteId(), status, q, page, size, sort, dir));
    }

    // ── Create ──────────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAuthority('ADMISSION_CREATE')")
    @Operation(summary = "Create a new admission from a converted lead")
    public ResponseEntity<ApiResponse<AdmissionResponse>> create(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CreateAdmissionRequest request
    ) {
        var admission = admissionService.create(request, principal.getInstituteId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created("Admission created successfully", admission));
    }

    // ── Get by ID ───────────────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMISSION_VIEW')")
    @Operation(summary = "Get admission detail by ID")
    public ResponseEntity<ApiResponse<AdmissionResponse>> getById(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(admissionService.getById(id, principal.getInstituteId())));
    }

    // ── Update ──────────────────────────────────────────────────────────────

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMISSION_UPDATE')")
    @Operation(summary = "Update admission details (course, batch, fees, notes)")
    public ResponseEntity<ApiResponse<AdmissionResponse>> update(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody UpdateAdmissionRequest request
    ) {
        var admission = admissionService.update(id, request, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Admission updated successfully", admission));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ADMISSION_UPDATE')")
    @Operation(summary = "Update admission status (PENDING, DOCUMENTS_PENDING, ENROLLED, ACTIVE, COMPLETED, CANCELLED)")
    public ResponseEntity<ApiResponse<AdmissionResponse>> updateStatus(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody UpdateAdmissionStatusRequest request
    ) {
        var admission = admissionService.updateStatus(id, request, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Admission status updated", admission));
    }

    // ── Assign / remove batch ───────────────────────────────────────────────

    @PatchMapping("/{id}/batch")
    @PreAuthorize("hasAuthority('BATCH_ASSIGN')")
    @Operation(summary = "Assign or unassign a batch to this admission (batchId=null to remove)")
    public ResponseEntity<ApiResponse<AdmissionResponse>> assignBatch(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @RequestBody java.util.Map<String, Object> body
    ) {
        Long batchId = body.get("batchId") != null
            ? Long.parseLong(body.get("batchId").toString())
            : null;
        var admission = admissionService.assignBatch(id, batchId, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Batch assignment updated", admission));
    }

    // ── Enroll (create student from admission) ──────────────────────────────

    @PostMapping("/{id}/enroll")
    @PreAuthorize("hasAuthority('ADMISSION_UPDATE')")
    @Operation(summary = "Create a full student record from this admission")
    public ResponseEntity<ApiResponse<AdmissionResponse>> enroll(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody CreateStudentRequest request
    ) {
        var admission = admissionService.enroll(id, request, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Student record created successfully", admission));
    }

    // ── Delete ──────────────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMISSION_DELETE')")
    @Operation(summary = "Soft-delete an admission")
    public ResponseEntity<ApiResponse<Void>> delete(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        admissionService.delete(id, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.message("Admission deleted successfully"));
    }
}
