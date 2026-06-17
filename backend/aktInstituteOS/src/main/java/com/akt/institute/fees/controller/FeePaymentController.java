package com.akt.institute.fees.controller;

import com.akt.institute.fees.dto.CreateFeePaymentRequest;
import com.akt.institute.fees.dto.FacultyAdmissionFeeRow;
import com.akt.institute.fees.dto.FeePaymentResponse;
import com.akt.institute.fees.dto.FeesSummaryResponse;
import com.akt.institute.fees.service.FeePaymentService;
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
@RequestMapping("/api/v1/fees")
@RequiredArgsConstructor
@Tag(name = "Fees", description = "Fee collection and payment management")
@SecurityRequirement(name = "bearerAuth")
public class FeePaymentController {

    private final FeePaymentService feePaymentService;

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('FEE_VIEW')")
    @Operation(summary = "Get fee collection summary (today, month, year, outstanding)")
    public ResponseEntity<ApiResponse<FeesSummaryResponse>> summary(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(feePaymentService.summary(principal.getInstituteId())));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('FEE_VIEW')")
    @Operation(summary = "List fee payments with optional filters")
    public ResponseEntity<ApiResponse<List<FeePaymentResponse>>> list(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(required = false) Long admissionId,
        @RequestParam(required = false) String paymentMode,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        size = Math.min(size, 100);
        return ResponseEntity.ok(
            feePaymentService.list(principal.getInstituteId(), admissionId, paymentMode, from, to, page, size));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('FEE_COLLECT')")
    @Operation(summary = "Record a fee payment and generate receipt")
    public ResponseEntity<ApiResponse<FeePaymentResponse>> collect(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CreateFeePaymentRequest request
    ) {
        var payment = feePaymentService.collect(request, principal.getInstituteId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created("Payment recorded — " + payment.getReceiptNumber(), payment));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('FEE_DELETE')")
    @Operation(summary = "Cancel a fee payment (soft-delete, recalculates admission fees_paid)")
    public ResponseEntity<ApiResponse<Void>> cancel(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        feePaymentService.cancel(id, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.message("Payment cancelled successfully"));
    }

    // ── Faculty-scoped fee views (read-only) ──────────────────────────────────

    /**
     * Returns admission fee rows for students in the calling faculty's assigned batches.
     * Gated on STUDENT_VIEW since faculty can already view their assigned students.
     * type: "pending" | "collected" | (blank = all)
     */
    @GetMapping("/faculty")
    @PreAuthorize("hasAuthority('STUDENT_VIEW')")
    @Operation(summary = "Faculty: list fee records for assigned batch students (read-only, scoped)")
    public ResponseEntity<ApiResponse<List<FacultyAdmissionFeeRow>>> facultyFees(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(required = false, defaultValue = "") String type,
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        size = Math.min(size, 100);
        return ResponseEntity.ok(feePaymentService.listFacultyAdmissions(
                principal.getInstituteId(), principal.getId(), type, page, size));
    }

    /**
     * Returns fee details for a specific student, validated that the student belongs
     * to one of the calling faculty's assigned batches.
     */
    @GetMapping("/faculty/student/{studentId}")
    @PreAuthorize("hasAuthority('STUDENT_VIEW')")
    @Operation(summary = "Faculty: get fee details for a specific assigned student (read-only)")
    public ResponseEntity<ApiResponse<List<FacultyAdmissionFeeRow>>> facultyStudentFees(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long studentId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(feePaymentService.listFacultyStudentAdmissions(
                principal.getInstituteId(), principal.getId(), studentId)));
    }
}
