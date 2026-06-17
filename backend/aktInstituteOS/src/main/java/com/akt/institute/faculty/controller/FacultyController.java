package com.akt.institute.faculty.controller;

import com.akt.institute.faculty.dto.FacultyProfileRequest;
import com.akt.institute.faculty.dto.FacultyProfileResponse;
import com.akt.institute.faculty.service.FacultyService;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/faculty")
@RequiredArgsConstructor
@Tag(name = "Faculty", description = "Faculty profile management")
@SecurityRequirement(name = "bearerAuth")
public class FacultyController {

    private final FacultyService facultyService;

    @GetMapping
    @PreAuthorize("hasAuthority('FACULTY_PROFILE_VIEW')")
    @Operation(summary = "List all faculty profiles for the institute")
    public ResponseEntity<ApiResponse<List<FacultyProfileResponse>>> list(
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(facultyService.list(p.getInstituteId())));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAuthority('FACULTY_PROFILE_VIEW')")
    @Operation(summary = "Get the logged-in faculty's own profile")
    public ResponseEntity<ApiResponse<FacultyProfileResponse>> me(
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(facultyService.getByUserId(p.getId(), p.getInstituteId())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('FACULTY_PROFILE_VIEW')")
    @Operation(summary = "Get faculty profile by ID")
    public ResponseEntity<ApiResponse<FacultyProfileResponse>> get(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(facultyService.getById(id, p.getInstituteId())));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAuthority('FACULTY_PROFILE_VIEW')")
    @Operation(summary = "Get faculty profile by user ID")
    public ResponseEntity<ApiResponse<FacultyProfileResponse>> getByUserId(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(facultyService.getByUserId(userId, p.getInstituteId())));
    }

    @PutMapping("/user/{userId}")
    @PreAuthorize("hasAuthority('FACULTY_PROFILE_MANAGE')")
    @Operation(summary = "Create or update faculty profile for a user")
    public ResponseEntity<ApiResponse<FacultyProfileResponse>> upsert(
            @PathVariable Long userId,
            @Valid @RequestBody FacultyProfileRequest req,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok("Faculty profile updated",
                facultyService.upsert(userId, p.getInstituteId(), p.getId(), req)));
    }

    @PutMapping("/me")
    @PreAuthorize("hasAuthority('FACULTY_PROFILE_VIEW')")
    @Operation(summary = "Faculty updates their own profile")
    public ResponseEntity<ApiResponse<FacultyProfileResponse>> updateMe(
            @Valid @RequestBody FacultyProfileRequest req,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok("Profile updated",
                facultyService.upsert(p.getId(), p.getInstituteId(), p.getId(), req)));
    }
}
