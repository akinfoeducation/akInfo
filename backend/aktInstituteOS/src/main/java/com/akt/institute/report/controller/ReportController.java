package com.akt.institute.report.controller;

import com.akt.institute.report.dto.*;
import com.akt.institute.report.service.ReportService;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.dto.PageMeta;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Reports")
@SecurityRequirement(name = "bearerAuth")
public class ReportController {

    private final ReportService svc;

    // ── Summary bar ───────────────────────────────────────────────────────────

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    @Operation(summary = "Summary stats for the selected date range")
    public ResponseEntity<ApiResponse<ReportSummary>> summary(
        @AuthenticationPrincipal UserPrincipal p,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to
    ) {
        DateRange r = range(from, to);
        return ok(svc.summary(p.getInstituteId(), r.from(), r.to()));
    }

    // ── Overview snapshot ────────────────────────────────────────────────────

    @GetMapping("/overview")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<ApiResponse<ReportOverviewResponse>> overview(@AuthenticationPrincipal UserPrincipal p) {
        return ok(svc.overview(p.getInstituteId()));
    }

    // ── 1. Admission report ──────────────────────────────────────────────────

    @GetMapping("/admissions")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    @Operation(summary = "Paginated admission report with filters")
    public ResponseEntity<ApiResponse<List<AdmissionReportRow>>> admissions(
        @AuthenticationPrincipal UserPrincipal p,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String course,
        @RequestParam(required = false) String batch,
        @RequestParam(required = false) String counsellorId,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "0")   int page,
        @RequestParam(defaultValue = "20")  int size,
        @RequestParam(defaultValue = "created_at") String sort,
        @RequestParam(defaultValue = "desc") String dir
    ) {
        DateRange r = range(from, to);
        List<AdmissionReportRow> data = svc.admissionReport(p.getInstituteId(), r.from(), r.to(), status, course, batch, counsellorId, q, page, size, sort, dir);
        long total = svc.admissionReportCount(p.getInstituteId(), r.from(), r.to(), status, course, batch, counsellorId, q);
        return paged(data, page, size, total);
    }

    // ── 2. Fee collection report ─────────────────────────────────────────────

    @GetMapping("/fee-collection")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    @Operation(summary = "Paginated fee collection report")
    public ResponseEntity<ApiResponse<List<FeeCollectionReportRow>>> feeCollection(
        @AuthenticationPrincipal UserPrincipal p,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(required = false) String course,
        @RequestParam(required = false) String paymentMode,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "0")   int page,
        @RequestParam(defaultValue = "20")  int size,
        @RequestParam(defaultValue = "payment_date") String sort,
        @RequestParam(defaultValue = "desc") String dir
    ) {
        DateRange r = range(from, to);
        List<FeeCollectionReportRow> data = svc.feeCollectionReport(p.getInstituteId(), r.from(), r.to(), course, paymentMode, q, page, size, sort, dir);
        long total = svc.feeCollectionReportCount(p.getInstituteId(), r.from(), r.to(), course, paymentMode, q);
        return paged(data, page, size, total);
    }

    // ── 3. Pending fee report ────────────────────────────────────────────────

    @GetMapping("/pending-fees")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    @Operation(summary = "All admissions with outstanding fee balance")
    public ResponseEntity<ApiResponse<List<PendingFeeReportRow>>> pendingFees(
        @AuthenticationPrincipal UserPrincipal p,
        @RequestParam(required = false) String course,
        @RequestParam(required = false) String batch,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "0")   int page,
        @RequestParam(defaultValue = "20")  int size,
        @RequestParam(defaultValue = "fees_due") String sort,
        @RequestParam(defaultValue = "desc") String dir
    ) {
        List<PendingFeeReportRow> data = svc.pendingFeeReport(p.getInstituteId(), course, batch, status, q, page, size, sort, dir);
        long total = svc.pendingFeeReportCount(p.getInstituteId(), course, batch, status, q);
        return paged(data, page, size, total);
    }

    // ── 4. Expense report ────────────────────────────────────────────────────

    @GetMapping("/expenses")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    @Operation(summary = "Paginated expense report")
    public ResponseEntity<ApiResponse<List<ExpenseReportRow>>> expenses(
        @AuthenticationPrincipal UserPrincipal p,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "0")   int page,
        @RequestParam(defaultValue = "20")  int size,
        @RequestParam(defaultValue = "expense_date") String sort,
        @RequestParam(defaultValue = "desc") String dir
    ) {
        DateRange r = range(from, to);
        List<ExpenseReportRow> data = svc.expenseReport(p.getInstituteId(), r.from(), r.to(), category, q, page, size, sort, dir);
        long total = svc.expenseReportCount(p.getInstituteId(), r.from(), r.to(), category, q);
        return paged(data, page, size, total);
    }

    // ── 5. Daily collection ──────────────────────────────────────────────────

    @GetMapping("/daily-collection")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    @Operation(summary = "Day-by-day collection and expense summary")
    public ResponseEntity<ApiResponse<List<DailyCollectionRow>>> dailyCollection(
        @AuthenticationPrincipal UserPrincipal p,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to
    ) {
        DateRange r = range(from, to);
        return ok(svc.dailyCollection(p.getInstituteId(), r.from(), r.to()));
    }

    // ── 6. Monthly revenue trends ────────────────────────────────────────────

    @GetMapping("/trends/revenue")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<ApiResponse<List<MonthlyDataPoint>>> revenueTrend(
        @AuthenticationPrincipal UserPrincipal p, @RequestParam(defaultValue = "12") int months) {
        return ok(svc.revenueTrend(p.getInstituteId(), months));
    }

    @GetMapping("/trends/admissions")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<ApiResponse<List<MonthlyDataPoint>>> admissionsTrend(
        @AuthenticationPrincipal UserPrincipal p, @RequestParam(defaultValue = "12") int months) {
        return ok(svc.admissionsTrend(p.getInstituteId(), months));
    }

    @GetMapping("/trends/leads")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<ApiResponse<List<MonthlyDataPoint>>> leadsTrend(
        @AuthenticationPrincipal UserPrincipal p, @RequestParam(defaultValue = "12") int months) {
        return ok(svc.leadsTrend(p.getInstituteId(), months));
    }

    // ── 7. Batch-wise student report ─────────────────────────────────────────

    @GetMapping("/batch-students")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    @Operation(summary = "Admissions and fees grouped by course and batch")
    public ResponseEntity<ApiResponse<List<BatchStudentReportRow>>> batchStudents(
        @AuthenticationPrincipal UserPrincipal p,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(required = false) String course
    ) {
        DateRange r = range(from, to);
        return ok(svc.batchStudentReport(p.getInstituteId(), r.from(), r.to(), course));
    }

    // ── 8. Enquiry conversion ────────────────────────────────────────────────

    @GetMapping("/enquiry-conversion")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    @Operation(summary = "Lead-to-admission conversion funnel")
    public ResponseEntity<ApiResponse<List<EnquiryConversionRow>>> enquiryConversion(
        @AuthenticationPrincipal UserPrincipal p,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(required = false) String source,
        @RequestParam(required = false) String counsellorId,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "0")   int page,
        @RequestParam(defaultValue = "20")  int size,
        @RequestParam(defaultValue = "created_at") String sort,
        @RequestParam(defaultValue = "desc") String dir
    ) {
        DateRange r = range(from, to);
        List<EnquiryConversionRow> data = svc.enquiryConversionReport(p.getInstituteId(), r.from(), r.to(), source, counsellorId, q, page, size, sort, dir);
        long total = svc.enquiryConversionReportCount(p.getInstituteId(), r.from(), r.to(), source, counsellorId, q);
        return paged(data, page, size, total);
    }

    // ── Funnel / breakdown (charts) ──────────────────────────────────────────

    @GetMapping("/leads/by-status")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<ApiResponse<List<LeadFunnelItem>>> leadsByStatus(
        @AuthenticationPrincipal UserPrincipal p, @RequestParam(required=false) String from, @RequestParam(required=false) String to) {
        DateRange r = range(from, to); return ok(svc.leadFunnelByStatus(p.getInstituteId(), r.from(), r.to()));
    }
    @GetMapping("/leads/by-source")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<ApiResponse<List<LeadFunnelItem>>> leadsBySource(
        @AuthenticationPrincipal UserPrincipal p, @RequestParam(required=false) String from, @RequestParam(required=false) String to) {
        DateRange r = range(from, to); return ok(svc.leadFunnelBySource(p.getInstituteId(), r.from(), r.to()));
    }
    @GetMapping("/courses/breakdown")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<ApiResponse<List<CourseBreakdownItem>>> courseBreakdown(
        @AuthenticationPrincipal UserPrincipal p, @RequestParam(required=false) String from, @RequestParam(required=false) String to) {
        DateRange r = range(from, to); return ok(svc.courseBreakdown(p.getInstituteId(), r.from(), r.to()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static <T> ResponseEntity<ApiResponse<T>> ok(T data) {
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    private static <T> ResponseEntity<ApiResponse<List<T>>> paged(List<T> data, int page, int size, long total) {
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / size);
        return ResponseEntity.ok(ApiResponse.paged(data,
            PageMeta.builder().page(page).size(size).total(total).totalPages(totalPages)
                .hasNext((long)(page+1)*size < total).hasPrevious(page > 0).build()));
    }

    private static DateRange range(String from, String to) {
        LocalDate f = from != null && !from.isBlank() ? LocalDate.parse(from) : YearMonth.now().atDay(1);
        LocalDate t = to   != null && !to.isBlank()   ? LocalDate.parse(to)   : LocalDate.now();
        return new DateRange(f, t);
    }

    private record DateRange(LocalDate from, LocalDate to) {}
}
