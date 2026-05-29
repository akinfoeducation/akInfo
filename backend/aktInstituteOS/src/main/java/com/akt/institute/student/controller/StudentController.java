package com.akt.institute.student.controller;

import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import com.akt.institute.student.dto.*;
import com.akt.institute.student.service.StudentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@RequestMapping("/api/v1/students")
@RequiredArgsConstructor
@Tag(name = "Students", description = "Student registration, profile management, documents")
@SecurityRequirement(name = "bearerAuth")
public class StudentController {

    private final StudentService studentService;

    // ── List & Search ───────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('STUDENT_VIEW')")
    @Operation(summary = "List students with optional filters and pagination")
    public ResponseEntity<ApiResponse<List<StudentSummaryResponse>>> list(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt") String sort,
        @RequestParam(defaultValue = "desc") String dir
    ) {
        size = Math.min(size, 100); // cap page size
        var result = studentService.list(principal.getInstituteId(), status, q, page, size, sort, dir);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('STUDENT_VIEW')")
    @Operation(summary = "Fast full-text search via Meilisearch (typo-tolerant). Falls back to MySQL if search is unavailable.")
    public ResponseEntity<ApiResponse<List<StudentSummaryResponse>>> search(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam String q,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        size = Math.min(size, 50);
        var result = studentService.search(q, principal.getInstituteId(), status, page, size);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/check-duplicate")
    @PreAuthorize("hasAuthority('STUDENT_VIEW')")
    @Operation(summary = "Check if phone or email already exists before creating a student")
    public ResponseEntity<ApiResponse<DuplicateCheckResponse>> checkDuplicate(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(required = false) String phone,
        @RequestParam(required = false) String email
    ) {
        var result = studentService.checkDuplicate(phone, email, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // ── Create ──────────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAuthority('STUDENT_CREATE')")
    @Operation(summary = "Register a new student")
    public ResponseEntity<ApiResponse<StudentResponse>> create(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CreateStudentRequest request
    ) {
        var student = studentService.create(request, principal.getInstituteId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created("Student registered successfully", student));
    }

    // ── Get by ID ───────────────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('STUDENT_VIEW')")
    @Operation(summary = "Get student profile by ID")
    public ResponseEntity<ApiResponse<StudentResponse>> getById(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        var student = studentService.getById(id, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok(student));
    }

    // ── Update ──────────────────────────────────────────────────────────────

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('STUDENT_UPDATE')")
    @Operation(summary = "Update student profile")
    public ResponseEntity<ApiResponse<StudentResponse>> update(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody UpdateStudentRequest request
    ) {
        var student = studentService.update(id, request, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Student updated successfully", student));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('STUDENT_UPDATE')")
    @Operation(summary = "Update student status (ACTIVE, INACTIVE, GRADUATED, DROPPED)")
    public ResponseEntity<ApiResponse<StudentResponse>> updateStatus(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody UpdateStudentStatusRequest request
    ) {
        var student = studentService.updateStatus(id, request, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Student status updated", student));
    }

    // ── Photo ───────────────────────────────────────────────────────────────

    @PostMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('STUDENT_UPDATE')")
    @Operation(summary = "Upload or replace student profile photo (JPEG, PNG, WebP — max 10 MB)")
    public ResponseEntity<ApiResponse<StudentResponse>> uploadPhoto(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @RequestPart("file") MultipartFile file
    ) {
        var student = studentService.uploadPhoto(id, file, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok("Photo uploaded", student));
    }

    // ── Delete ──────────────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('STUDENT_DELETE')")
    @Operation(summary = "Soft-delete a student (sets deleted_at, hidden from all queries)")
    public ResponseEntity<ApiResponse<Void>> delete(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        studentService.delete(id, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.message("Student deleted successfully"));
    }

    // ── Documents ───────────────────────────────────────────────────────────

    @GetMapping("/{id}/documents")
    @PreAuthorize("hasAuthority('STUDENT_VIEW')")
    @Operation(summary = "List all documents for a student")
    public ResponseEntity<ApiResponse<List<StudentResponse.DocumentInfo>>> listDocuments(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        var docs = studentService.listDocuments(id, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.ok(docs));
    }

    @PostMapping(value = "/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('STUDENT_UPDATE')")
    @Operation(summary = "Upload a document for a student (JPEG, PNG, PDF — max 10 MB)")
    public ResponseEntity<ApiResponse<StudentResponse.DocumentInfo>> uploadDocument(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @RequestPart("file") MultipartFile file,
        @RequestParam String documentType
    ) {
        var doc = studentService.uploadDocument(id, file, documentType, principal.getInstituteId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created("Document uploaded", doc));
    }

    @DeleteMapping("/{id}/documents/{documentId}")
    @PreAuthorize("hasAuthority('STUDENT_UPDATE')")
    @Operation(summary = "Delete a student document")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @PathVariable Long documentId
    ) {
        studentService.deleteDocument(id, documentId, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.message("Document deleted"));
    }
}
