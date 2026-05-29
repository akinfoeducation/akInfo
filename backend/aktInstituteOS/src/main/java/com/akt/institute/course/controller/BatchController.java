package com.akt.institute.course.controller;

import com.akt.institute.course.dto.*;
import com.akt.institute.course.service.CourseService;
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
@RequestMapping("/api/v1/batches")
@RequiredArgsConstructor
@Tag(name = "Batches")
@SecurityRequirement(name = "bearerAuth")
public class BatchController {

    private final CourseService courseService;

    // ── Dashboard ────────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('BATCH_VIEW')")
    @Operation(summary = "Batch dashboard — counts and active/upcoming lists")
    public ResponseEntity<ApiResponse<BatchDashboardResponse>> dashboard(
        @AuthenticationPrincipal UserPrincipal p
    ) {
        return ResponseEntity.ok(ApiResponse.ok(courseService.batchDashboard(p.getInstituteId())));
    }

    // ── List ─────────────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('BATCH_VIEW')")
    @Operation(summary = "List all batches with optional status filter")
    public ResponseEntity<ApiResponse<List<BatchResponse>>> listAll(
        @AuthenticationPrincipal UserPrincipal p,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) Long courseId
    ) {
        List<BatchResponse> batches = courseId != null
            ? courseService.listBatches(courseId, p.getInstituteId())
            : courseService.listAllBatches(p.getInstituteId(), status);
        return ResponseEntity.ok(ApiResponse.ok(batches));
    }

    // ── Create ────────────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAuthority('BATCH_MANAGE')")
    @Operation(summary = "Create a new batch (requires courseId in body)")
    public ResponseEntity<ApiResponse<BatchResponse>> create(
        @AuthenticationPrincipal UserPrincipal p,
        @RequestParam Long courseId,
        @Valid @RequestBody CreateBatchRequest request
    ) {
        var batch = courseService.createBatchDirect(request, courseId, p.getInstituteId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created("Batch created successfully", batch));
    }

    // ── Get by ID ─────────────────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BATCH_VIEW')")
    @Operation(summary = "Get batch detail with capacity info")
    public ResponseEntity<ApiResponse<BatchResponse>> getById(
        @AuthenticationPrincipal UserPrincipal p,
        @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(courseService.getBatch(id, p.getInstituteId())));
    }

    // ── Update ────────────────────────────────────────────────────────────────

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BATCH_MANAGE')")
    @Operation(summary = "Update batch details")
    public ResponseEntity<ApiResponse<BatchResponse>> update(
        @AuthenticationPrincipal UserPrincipal p,
        @PathVariable Long id,
        @Valid @RequestBody UpdateBatchRequest request
    ) {
        var batch = courseService.updateBatchDirect(id, request, p.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Batch updated", batch));
    }

    // ── Patch status ──────────────────────────────────────────────────────────

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('BATCH_MANAGE')")
    @Operation(summary = "Update batch status (PLANNED, ACTIVE, COMPLETED, CANCELLED)")
    public ResponseEntity<ApiResponse<BatchResponse>> updateStatus(
        @AuthenticationPrincipal UserPrincipal p,
        @PathVariable Long id,
        @Valid @RequestBody UpdateBatchStatusRequest request
    ) {
        var batch = courseService.patchBatchStatus(id, request.getStatus(), p.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Batch status updated", batch));
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('BATCH_MANAGE')")
    @Operation(summary = "Soft-delete a batch")
    public ResponseEntity<ApiResponse<Void>> delete(
        @AuthenticationPrincipal UserPrincipal p,
        @PathVariable Long id
    ) {
        courseService.deleteBatchDirect(id, p.getInstituteId());
        return ResponseEntity.ok(ApiResponse.message("Batch deleted"));
    }

    // ── Students ──────────────────────────────────────────────────────────────

    @GetMapping("/{id}/students")
    @PreAuthorize("hasAuthority('BATCH_VIEW')")
    @Operation(summary = "Get paginated student list for this batch")
    public ResponseEntity<ApiResponse<List<BatchStudentRow>>> students(
        @AuthenticationPrincipal UserPrincipal p,
        @PathVariable Long id,
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(courseService.batchStudents(id, p.getInstituteId(), page, size)));
    }

    // ── Assignment history ────────────────────────────────────────────────────

    @GetMapping("/assignments/history")
    @PreAuthorize("hasAuthority('BATCH_VIEW')")
    @Operation(summary = "Get batch assignment history for an admission")
    public ResponseEntity<ApiResponse<List<BatchAssignmentHistoryRow>>> assignmentHistory(
        @AuthenticationPrincipal UserPrincipal p,
        @RequestParam Long admissionId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            courseService.getBatchAssignmentHistory(admissionId, p.getInstituteId())));
    }
}
