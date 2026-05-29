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
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
@Tag(name = "Courses", description = "Course and batch management")
@SecurityRequirement(name = "bearerAuth")
public class CourseController {

    private final CourseService courseService;

    // ── Courses ──────────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('COURSE_VIEW')")
    @Operation(summary = "List all courses (optionally filter by status)")
    public ResponseEntity<ApiResponse<List<CourseSummaryResponse>>> list(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(
            ApiResponse.ok(courseService.listCourses(principal.getInstituteId(), status)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('COURSE_CREATE')")
    @Operation(summary = "Create a new course")
    public ResponseEntity<ApiResponse<CourseResponse>> create(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CreateCourseRequest request
    ) {
        var course = courseService.createCourse(request, principal.getInstituteId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created("Course created successfully", course));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('COURSE_VIEW')")
    @Operation(summary = "Get course detail with batches")
    public ResponseEntity<ApiResponse<CourseResponse>> getById(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(courseService.getCourse(id, principal.getInstituteId())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('COURSE_UPDATE')")
    @Operation(summary = "Update course details or status")
    public ResponseEntity<ApiResponse<CourseResponse>> update(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody UpdateCourseRequest request
    ) {
        var course = courseService.updateCourse(id, request, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Course updated successfully", course));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('COURSE_DELETE')")
    @Operation(summary = "Soft-delete a course")
    public ResponseEntity<ApiResponse<Void>> delete(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        courseService.deleteCourse(id, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.message("Course deleted successfully"));
    }

    // ── Batches ──────────────────────────────────────────────────────────────

    @GetMapping("/{courseId}/batches")
    @PreAuthorize("hasAuthority('COURSE_VIEW')")
    @Operation(summary = "List batches for a course")
    public ResponseEntity<ApiResponse<List<BatchResponse>>> listBatches(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long courseId
    ) {
        return ResponseEntity.ok(
            ApiResponse.ok(courseService.listBatches(courseId, principal.getInstituteId())));
    }

    @PostMapping("/{courseId}/batches")
    @PreAuthorize("hasAuthority('COURSE_CREATE')")
    @Operation(summary = "Add a batch to a course")
    public ResponseEntity<ApiResponse<BatchResponse>> createBatch(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long courseId,
        @Valid @RequestBody CreateBatchRequest request
    ) {
        var batch = courseService.createBatch(courseId, request, principal.getInstituteId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created("Batch created successfully", batch));
    }

    @PutMapping("/{courseId}/batches/{batchId}")
    @PreAuthorize("hasAuthority('COURSE_UPDATE')")
    @Operation(summary = "Update a batch")
    public ResponseEntity<ApiResponse<BatchResponse>> updateBatch(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long courseId,
        @PathVariable Long batchId,
        @Valid @RequestBody UpdateBatchRequest request
    ) {
        var batch = courseService.updateBatch(courseId, batchId, request, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Batch updated successfully", batch));
    }

    @DeleteMapping("/{courseId}/batches/{batchId}")
    @PreAuthorize("hasAuthority('COURSE_DELETE')")
    @Operation(summary = "Soft-delete a batch")
    public ResponseEntity<ApiResponse<Void>> deleteBatch(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long courseId,
        @PathVariable Long batchId
    ) {
        courseService.deleteBatch(courseId, batchId, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.message("Batch deleted successfully"));
    }
}
