package com.akt.institute.report.service;

import com.akt.institute.report.dto.*;
import com.akt.institute.report.repository.ReportDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportDao reportDao;

    // ── Summary ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ReportSummary summary(Long instituteId, LocalDate from, LocalDate to) {
        return reportDao.summary(instituteId, from, to);
    }

    // ── Overview snapshot (dashboard) ────────────────────────────────────────

    @Transactional(readOnly = true)
    public ReportOverviewResponse overview(Long instituteId) {
        LocalDate f = YearMonth.now().atDay(1);
        LocalDate t = LocalDate.now();
        int year    = t.getYear();

        long newLeads  = reportDao.countLeads(instituteId, f, t);
        long converted = reportDao.countConvertedLeads(instituteId, f, t);
        double rate    = newLeads == 0 ? 0.0 : Math.round(converted * 1000.0 / newLeads) / 10.0;

        return ReportOverviewResponse.builder()
            .totalLeads(reportDao.countTotalLeads(instituteId))
            .newLeadsThisMonth(newLeads)
            .convertedLeadsThisMonth(converted)
            .conversionRate(rate)
            .totalAdmissions(reportDao.countTotalAdmissions(instituteId))
            .admissionsThisMonth(reportDao.countAdmissions(instituteId, f, t))
            .activeAdmissions(reportDao.countActiveAdmissions(instituteId))
            .revenueThisMonth(reportDao.sumRevenue(instituteId, f, t))
            .revenueThisYear(reportDao.sumRevenueThisYear(instituteId, year))
            .totalOutstanding(reportDao.totalOutstanding(instituteId))
            .overdueCount(reportDao.countOverdue(instituteId))
            .totalStudents(reportDao.countTotalStudents(instituteId))
            .build();
    }

    // ── 8 paginated reports ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AdmissionReportRow> admissionReport(Long iid, LocalDate from, LocalDate to,
            String status, String course, String batch, String counsellorId,
            String q, int page, int size, String sort, String dir) {
        return reportDao.admissionReport(iid, from, to, status, course, batch, counsellorId, q, page, cap(size), sort, dir);
    }
    public long admissionReportCount(Long iid, LocalDate from, LocalDate to,
            String status, String course, String batch, String counsellorId, String q) {
        return reportDao.admissionReportCount(iid, from, to, status, course, batch, counsellorId, q);
    }

    @Transactional(readOnly = true)
    public List<FeeCollectionReportRow> feeCollectionReport(Long iid, LocalDate from, LocalDate to,
            String course, String mode, String q, int page, int size, String sort, String dir) {
        return reportDao.feeCollectionReport(iid, from, to, course, mode, q, page, cap(size), sort, dir);
    }
    public long feeCollectionReportCount(Long iid, LocalDate from, LocalDate to,
            String course, String mode, String q) {
        return reportDao.feeCollectionReportCount(iid, from, to, course, mode, q);
    }

    @Transactional(readOnly = true)
    public List<PendingFeeReportRow> pendingFeeReport(Long iid, String course, String batch,
            String status, String q, int page, int size, String sort, String dir) {
        return reportDao.pendingFeeReport(iid, course, batch, status, q, page, cap(size), sort, dir);
    }
    public long pendingFeeReportCount(Long iid, String course, String batch, String status, String q) {
        return reportDao.pendingFeeReportCount(iid, course, batch, status, q);
    }

    @Transactional(readOnly = true)
    public List<ExpenseReportRow> expenseReport(Long iid, LocalDate from, LocalDate to,
            String category, String q, int page, int size, String sort, String dir) {
        return reportDao.expenseReport(iid, from, to, category, q, page, cap(size), sort, dir);
    }
    public long expenseReportCount(Long iid, LocalDate from, LocalDate to, String category, String q) {
        return reportDao.expenseReportCount(iid, from, to, category, q);
    }

    @Transactional(readOnly = true)
    public List<DailyCollectionRow> dailyCollection(Long iid, LocalDate from, LocalDate to) {
        return reportDao.dailyCollection(iid, from, to);
    }

    @Transactional(readOnly = true)
    public List<MonthlyDataPoint> revenueTrend(Long iid, int months) {
        return reportDao.monthlyRevenue(iid, Math.min(Math.max(months, 1), 24));
    }
    @Transactional(readOnly = true)
    public List<MonthlyDataPoint> admissionsTrend(Long iid, int months) {
        return reportDao.monthlyAdmissions(iid, Math.min(Math.max(months, 1), 24));
    }
    @Transactional(readOnly = true)
    public List<MonthlyDataPoint> leadsTrend(Long iid, int months) {
        return reportDao.monthlyLeads(iid, Math.min(Math.max(months, 1), 24));
    }

    @Transactional(readOnly = true)
    public List<BatchStudentReportRow> batchStudentReport(Long iid, LocalDate from, LocalDate to, String course) {
        return reportDao.batchStudentReport(iid, from, to, course);
    }

    @Transactional(readOnly = true)
    public List<EnquiryConversionRow> enquiryConversionReport(Long iid, LocalDate from, LocalDate to,
            String source, String counsellorId, String q, int page, int size, String sort, String dir) {
        return reportDao.enquiryConversionReport(iid, from, to, source, counsellorId, q, page, cap(size), sort, dir);
    }
    public long enquiryConversionReportCount(Long iid, LocalDate from, LocalDate to,
            String source, String counsellorId, String q) {
        return reportDao.enquiryConversionReportCount(iid, from, to, source, counsellorId, q);
    }

    @Transactional(readOnly = true)
    public List<LeadFunnelItem> leadFunnelByStatus(Long iid, LocalDate from, LocalDate to) { return reportDao.leadsByStatus(iid, from, to); }
    @Transactional(readOnly = true)
    public List<LeadFunnelItem> leadFunnelBySource(Long iid, LocalDate from, LocalDate to) { return reportDao.leadsBySource(iid, from, to); }
    @Transactional(readOnly = true)
    public List<CourseBreakdownItem> courseBreakdown(Long iid, LocalDate from, LocalDate to) { return reportDao.courseBreakdown(iid, from, to); }

    private static int cap(int size) { return Math.min(size, 500); }
}
