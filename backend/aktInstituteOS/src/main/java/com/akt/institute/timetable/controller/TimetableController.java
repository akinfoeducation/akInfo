package com.akt.institute.timetable.controller;

import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import com.akt.institute.timetable.dto.TimetableRequest;
import com.akt.institute.timetable.dto.TimetableResponse;
import com.akt.institute.timetable.service.TimetableService;
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
@RequestMapping("/api/v1/timetable")
@RequiredArgsConstructor
@Tag(name = "Timetable", description = "Schedule management")
@SecurityRequirement(name = "bearerAuth")
public class TimetableController {

    private final TimetableService timetableService;

    @GetMapping
    @PreAuthorize("hasAuthority('TIMETABLE_VIEW')")
    @Operation(summary = "List timetable slots. Faculty are automatically scoped to their own schedule.")
    public ResponseEntity<ApiResponse<List<TimetableResponse>>> list(
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) Long facultyUserId,
            @AuthenticationPrincipal UserPrincipal p) {
        // Faculty users are always scoped to their own timetable; admins can filter freely
        Long fid = p.isFacultyOnly() ? p.getId() : facultyUserId;
        return ResponseEntity.ok(ApiResponse.ok(
                timetableService.list(p.getInstituteId(), batchId, fid)));
    }

    @GetMapping("/today")
    @PreAuthorize("hasAuthority('TIMETABLE_VIEW')")
    @Operation(summary = "Today's timetable. Faculty see only their own; admins can pass facultyUserId.")
    public ResponseEntity<ApiResponse<List<TimetableResponse>>> today(
            @RequestParam(required = false) Long facultyUserId,
            @AuthenticationPrincipal UserPrincipal p) {
        Long fid = p.isFacultyOnly() ? p.getId() : facultyUserId;
        return ResponseEntity.ok(ApiResponse.ok(timetableService.today(p.getInstituteId(), fid)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAuthority('TIMETABLE_VIEW')")
    @Operation(summary = "Logged-in faculty's full weekly schedule")
    public ResponseEntity<ApiResponse<List<TimetableResponse>>> mySchedule(
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(
                timetableService.mySchedule(p.getId(), p.getInstituteId())));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('TIMETABLE_MANAGE')")
    @Operation(summary = "Create a timetable slot")
    public ResponseEntity<ApiResponse<TimetableResponse>> create(
            @Valid @RequestBody TimetableRequest req,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Timetable slot created",
                        timetableService.create(p.getInstituteId(), p.getId(), req)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('TIMETABLE_MANAGE')")
    @Operation(summary = "Update a timetable slot")
    public ResponseEntity<ApiResponse<TimetableResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody TimetableRequest req,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok("Timetable updated",
                timetableService.update(id, p.getInstituteId(), p.getId(), req)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('TIMETABLE_MANAGE')")
    @Operation(summary = "Delete a timetable slot")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal p) {
        timetableService.delete(id, p.getInstituteId(), p.getId());
        return ResponseEntity.ok(ApiResponse.message("Timetable slot deleted"));
    }
}
