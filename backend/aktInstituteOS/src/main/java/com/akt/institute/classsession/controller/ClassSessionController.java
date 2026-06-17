package com.akt.institute.classsession.controller;

import com.akt.institute.classsession.dto.ClassSessionRequest;
import com.akt.institute.classsession.dto.ClassSessionResponse;
import com.akt.institute.classsession.service.ClassSessionService;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
@Tag(name = "Class Sessions", description = "Class session and topic tracking")
@SecurityRequirement(name = "bearerAuth")
public class ClassSessionController {

    private final ClassSessionService sessionService;

    @GetMapping
    @PreAuthorize("hasAuthority('CLASS_SESSION_VIEW')")
    @Operation(summary = "List class sessions. Faculty are always scoped to their own sessions.")
    public ResponseEntity<ApiResponse<List<ClassSessionResponse>>> list(
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) Long facultyUserId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserPrincipal p) {
        // Faculty are always scoped to their own sessions; admins can filter freely
        Long fid = p.isFacultyOnly() ? p.getId() : facultyUserId;
        return ResponseEntity.ok(ApiResponse.ok(
                sessionService.list(p.getInstituteId(), batchId, fid, from, to)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('CLASS_SESSION_VIEW')")
    @Operation(summary = "Get class session details. Faculty can only access their own sessions.")
    public ResponseEntity<ApiResponse<ClassSessionResponse>> get(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal p) {
        // For faculty, enforce that the session belongs to them
        Long requiredFacultyId = p.isFacultyOnly() ? p.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok(
                sessionService.get(id, p.getInstituteId(), requiredFacultyId)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CLASS_SESSION_MANAGE')")
    @Operation(summary = "Create a class session. Faculty are always recorded as the session faculty.")
    public ResponseEntity<ApiResponse<ClassSessionResponse>> create(
            @Valid @RequestBody ClassSessionRequest req,
            @AuthenticationPrincipal UserPrincipal p) {
        // Faculty can only create sessions assigned to themselves
        if (p.isFacultyOnly()) {
            req.setFacultyUserId(p.getId());
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Session created",
                        sessionService.create(p.getInstituteId(), p.getId(), req)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CLASS_SESSION_MANAGE')")
    @Operation(summary = "Update session notes, topic, status. Faculty can only update their own sessions.")
    public ResponseEntity<ApiResponse<ClassSessionResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody ClassSessionRequest req,
            @AuthenticationPrincipal UserPrincipal p) {
        // For faculty, enforce ownership before allowing update
        Long requiredFacultyId = p.isFacultyOnly() ? p.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok("Session updated",
                sessionService.update(id, p.getInstituteId(), p.getId(), req, requiredFacultyId)));
    }
}
