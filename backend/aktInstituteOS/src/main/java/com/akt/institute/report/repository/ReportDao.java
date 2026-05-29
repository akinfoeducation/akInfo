package com.akt.institute.report.repository;

import com.akt.institute.report.dto.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ReportDao {

    // ── Summary ──────────────────────────────────────────────────────────────
    ReportSummary summary(Long instituteId, LocalDate from, LocalDate to);

    // ── 1. Admission report ──────────────────────────────────────────────────
    List<AdmissionReportRow> admissionReport(Long instituteId, LocalDate from, LocalDate to,
        String status, String courseName, String batchName, String counsellorId,
        String q, int page, int size, String sort, String dir);
    long admissionReportCount(Long instituteId, LocalDate from, LocalDate to,
        String status, String courseName, String batchName, String counsellorId, String q);

    // ── 2. Fee collection report ─────────────────────────────────────────────
    List<FeeCollectionReportRow> feeCollectionReport(Long instituteId, LocalDate from, LocalDate to,
        String courseName, String paymentMode, String q, int page, int size, String sort, String dir);
    long feeCollectionReportCount(Long instituteId, LocalDate from, LocalDate to,
        String courseName, String paymentMode, String q);

    // ── 3. Pending fee report ────────────────────────────────────────────────
    List<PendingFeeReportRow> pendingFeeReport(Long instituteId,
        String courseName, String batchName, String status,
        String q, int page, int size, String sort, String dir);
    long pendingFeeReportCount(Long instituteId, String courseName, String batchName, String status, String q);

    // ── 4. Expense report ────────────────────────────────────────────────────
    List<ExpenseReportRow> expenseReport(Long instituteId, LocalDate from, LocalDate to,
        String category, String q, int page, int size, String sort, String dir);
    long expenseReportCount(Long instituteId, LocalDate from, LocalDate to, String category, String q);

    // ── 5. Daily collection ──────────────────────────────────────────────────
    List<DailyCollectionRow> dailyCollection(Long instituteId, LocalDate from, LocalDate to);

    // ── 6. Monthly revenue (trend) ───────────────────────────────────────────
    List<MonthlyDataPoint> monthlyRevenue(Long instituteId, int months);
    List<MonthlyDataPoint> monthlyAdmissions(Long instituteId, int months);
    List<MonthlyDataPoint> monthlyLeads(Long instituteId, int months);

    // ── 7. Batch-wise student report ─────────────────────────────────────────
    List<BatchStudentReportRow> batchStudentReport(Long instituteId, LocalDate from, LocalDate to,
        String courseName);

    // ── 8. Enquiry conversion report ─────────────────────────────────────────
    List<EnquiryConversionRow> enquiryConversionReport(Long instituteId, LocalDate from, LocalDate to,
        String source, String counsellorId, String q, int page, int size, String sort, String dir);
    long enquiryConversionReportCount(Long instituteId, LocalDate from, LocalDate to,
        String source, String counsellorId, String q);

    // ── Overview snapshot (existing) ─────────────────────────────────────────
    long countLeads(Long instituteId, LocalDate from, LocalDate to);
    long countConvertedLeads(Long instituteId, LocalDate from, LocalDate to);
    long countTotalLeads(Long instituteId);
    long countAdmissions(Long instituteId, LocalDate from, LocalDate to);
    long countTotalAdmissions(Long instituteId);
    long countActiveAdmissions(Long instituteId);
    BigDecimal sumRevenue(Long instituteId, LocalDate from, LocalDate to);
    BigDecimal sumRevenueThisYear(Long instituteId, int year);
    BigDecimal totalOutstanding(Long instituteId);
    long countOverdue(Long instituteId);
    long countTotalStudents(Long instituteId);
    List<LeadFunnelItem> leadsByStatus(Long instituteId, LocalDate from, LocalDate to);
    List<LeadFunnelItem> leadsBySource(Long instituteId, LocalDate from, LocalDate to);
    List<CourseBreakdownItem> courseBreakdown(Long instituteId, LocalDate from, LocalDate to);
}
