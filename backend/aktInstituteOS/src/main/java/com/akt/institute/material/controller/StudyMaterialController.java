package com.akt.institute.material.controller;

import com.akt.institute.material.dto.StudyMaterialResponse;
import com.akt.institute.material.service.StudyMaterialService;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@RequestMapping("/api/v1/materials")
@RequiredArgsConstructor
@Tag(name = "Study Materials", description = "Academic content sharing")
@SecurityRequirement(name = "bearerAuth")
public class StudyMaterialController {

    private final StudyMaterialService materialService;

    @GetMapping
    @PreAuthorize("hasAuthority('MATERIAL_VIEW')")
    @Operation(summary = "List study materials (filter by batchId, courseId, type)")
    public ResponseEntity<ApiResponse<List<StudyMaterialResponse>>> list(
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) String type,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(
                materialService.list(p.getInstituteId(), batchId, courseId, type)));
    }

    @PostMapping(value = "/link")
    @PreAuthorize("hasAuthority('MATERIAL_UPLOAD')")
    @Operation(summary = "Add an external link as study material")
    public ResponseEntity<ApiResponse<StudyMaterialResponse>> addLink(
            @RequestParam(required = false) Long   batchId,
            @RequestParam(required = false) Long   courseId,
            @RequestParam(required = false) String subject,
            @RequestParam String title,
            @RequestParam(required = false) String description,
            @RequestParam(defaultValue = "LINK") String materialType,
            @RequestParam String externalLink,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Material added",
                        materialService.addLink(p.getInstituteId(), p.getId(),
                                batchId, courseId, subject, title, description, materialType, externalLink)));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('MATERIAL_UPLOAD')")
    @Operation(summary = "Upload a file as study material (PDF, PPT, etc.)")
    public ResponseEntity<ApiResponse<StudyMaterialResponse>> uploadFile(
            @RequestParam(required = false) Long   batchId,
            @RequestParam(required = false) Long   courseId,
            @RequestParam(required = false) String subject,
            @RequestParam String title,
            @RequestParam(required = false) String description,
            @RequestParam(defaultValue = "PDF") String materialType,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("File uploaded",
                        materialService.uploadFile(p.getInstituteId(), p.getId(),
                                batchId, courseId, subject, title, description, materialType, file)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('MATERIAL_MANAGE')")
    @Operation(summary = "Delete a study material")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal p) {
        materialService.delete(id, p.getInstituteId(), p.getId());
        return ResponseEntity.ok(ApiResponse.message("Material deleted"));
    }
}
