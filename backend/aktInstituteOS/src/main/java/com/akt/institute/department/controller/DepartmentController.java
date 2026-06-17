package com.akt.institute.department.controller;

import com.akt.institute.department.dto.DepartmentRequest;
import com.akt.institute.department.dto.DepartmentResponse;
import com.akt.institute.department.service.DepartmentService;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/departments")
@RequiredArgsConstructor
@Tag(name = "Departments", description = "Department management within an institute")
@SecurityRequirement(name = "bearerAuth")
public class DepartmentController {

    private final DepartmentService departmentService;

    @GetMapping
    @PreAuthorize("hasAuthority('DEPT_VIEW')")
    public ResponseEntity<ApiResponse<List<DepartmentResponse>>> list(@AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(departmentService.list(p.getInstituteId())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('DEPT_VIEW')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> get(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(departmentService.get(id, p.getInstituteId())));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('DEPT_MANAGE')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> create(
            @Valid @RequestBody DepartmentRequest req, @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        var res = departmentService.create(req, p.getInstituteId(), p.getId(), ip(http), http.getHeader("User-Agent"));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created("Department created", res));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('DEPT_MANAGE')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> update(
            @PathVariable Long id, @Valid @RequestBody DepartmentRequest req,
            @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ResponseEntity.ok(ApiResponse.ok("Department updated",
                departmentService.update(id, req, p.getInstituteId(), p.getId(), ip(http), http.getHeader("User-Agent"))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('DEPT_MANAGE')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        departmentService.delete(id, p.getInstituteId(), p.getId(), ip(http), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.message("Department deleted"));
    }

    private String ip(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isBlank()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
