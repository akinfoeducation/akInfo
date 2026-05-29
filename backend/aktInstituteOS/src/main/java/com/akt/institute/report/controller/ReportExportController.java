package com.akt.institute.report.controller;

import com.akt.institute.report.dto.*;
import com.akt.institute.report.service.ReportService;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports/export")
@RequiredArgsConstructor
@Tag(name = "Report Exports")
@SecurityRequirement(name = "bearerAuth")
public class ReportExportController {

    private final ReportService svc;
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    // ── 1. Admissions ────────────────────────────────────────────────────────

    @GetMapping("/admissions.{fmt}")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<byte[]> exportAdmissions(
        @AuthenticationPrincipal UserPrincipal p,
        @PathVariable String fmt,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String course,
        @RequestParam(required = false) String batch,
        @RequestParam(required = false) String q
    ) throws IOException {
        var r = range(from, to);
        List<AdmissionReportRow> rows = svc.admissionReport(p.getInstituteId(), r.from(), r.to(), status, course, batch, null, q, 0, 5000, "created_at", "desc");
        String[] headers = {"Admission #","Student","Phone","Course","Batch","Fees Agreed","Fees Paid","Fees Due","Status","Counsellor","Enrolled On","Created At"};
        Object[][] data = rows.stream().map(row -> new Object[]{
            row.getAdmissionNumber(), row.getStudentName(), row.getPhone(),
            row.getCourseName(), row.getBatchName(), row.getFeesAgreed(), row.getFeesPaid(), row.getFeesDue(),
            row.getStatus(), row.getCounsellorName(), row.getEnrollmentDate(), row.getCreatedAt()
        }).toArray(Object[][]::new);
        return export(fmt, "admissions", headers, data);
    }

    // ── 2. Fee collection ────────────────────────────────────────────────────

    @GetMapping("/fee-collection.{fmt}")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<byte[]> exportFeeCollection(
        @AuthenticationPrincipal UserPrincipal p,
        @PathVariable String fmt,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(required = false) String course,
        @RequestParam(required = false) String paymentMode,
        @RequestParam(required = false) String q
    ) throws IOException {
        var r = range(from, to);
        List<FeeCollectionReportRow> rows = svc.feeCollectionReport(p.getInstituteId(), r.from(), r.to(), course, paymentMode, q, 0, 5000, "payment_date", "desc");
        String[] headers = {"Receipt #","Admission #","Student","Phone","Course","Amount","Date","Mode","Reference","Collected By"};
        Object[][] data = rows.stream().map(row -> new Object[]{
            row.getReceiptNumber(), row.getAdmissionNumber(), row.getStudentName(), row.getPhone(),
            row.getCourseName(), row.getAmount(), row.getPaymentDate(), row.getPaymentMode(),
            row.getReferenceNumber(), row.getCollectedBy()
        }).toArray(Object[][]::new);
        return export(fmt, "fee-collection", headers, data);
    }

    // ── 3. Pending fees ──────────────────────────────────────────────────────

    @GetMapping("/pending-fees.{fmt}")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<byte[]> exportPendingFees(
        @AuthenticationPrincipal UserPrincipal p,
        @PathVariable String fmt,
        @RequestParam(required = false) String course,
        @RequestParam(required = false) String batch,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String q
    ) throws IOException {
        List<PendingFeeReportRow> rows = svc.pendingFeeReport(p.getInstituteId(), course, batch, status, q, 0, 5000, "fees_due", "desc");
        String[] headers = {"Admission #","Student","Phone","Course","Batch","Fees Agreed","Fees Paid","Fees Due","Status","Enrolled On","Days Pending"};
        Object[][] data = rows.stream().map(row -> new Object[]{
            row.getAdmissionNumber(), row.getStudentName(), row.getPhone(),
            row.getCourseName(), row.getBatchName(),
            row.getFeesAgreed(), row.getFeesPaid(), row.getFeesDue(),
            row.getStatus(), row.getEnrollmentDate(), row.getDaysSinceEnrollment()
        }).toArray(Object[][]::new);
        return export(fmt, "pending-fees", headers, data);
    }

    // ── 4. Expenses ──────────────────────────────────────────────────────────

    @GetMapping("/expenses.{fmt}")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<byte[]> exportExpenses(
        @AuthenticationPrincipal UserPrincipal p,
        @PathVariable String fmt,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String q
    ) throws IOException {
        var r = range(from, to);
        List<ExpenseReportRow> rows = svc.expenseReport(p.getInstituteId(), r.from(), r.to(), category, q, 0, 5000, "expense_date", "desc");
        String[] headers = {"Expense #","Category","Description","Amount","Date","Paid To","Mode","Reference","Recorded By"};
        Object[][] data = rows.stream().map(row -> new Object[]{
            row.getExpenseNumber(), row.getCategory(), row.getDescription(), row.getAmount(),
            row.getExpenseDate(), row.getPaidTo(), row.getPaymentMode(),
            row.getReferenceNumber(), row.getCreatedByName()
        }).toArray(Object[][]::new);
        return export(fmt, "expenses", headers, data);
    }

    // ── 5. Enquiry conversion ────────────────────────────────────────────────

    @GetMapping("/enquiry-conversion.{fmt}")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<byte[]> exportEnquiryConversion(
        @AuthenticationPrincipal UserPrincipal p,
        @PathVariable String fmt,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(required = false) String source,
        @RequestParam(required = false) String q
    ) throws IOException {
        var r = range(from, to);
        List<EnquiryConversionRow> rows = svc.enquiryConversionReport(p.getInstituteId(), r.from(), r.to(), source, null, q, 0, 5000, "created_at", "desc");
        String[] headers = {"Lead Name","Phone","Source","Course Interested","Status","Counsellor","Created At","Converted At","Days to Convert","Admission Value"};
        Object[][] data = rows.stream().map(row -> new Object[]{
            row.getLeadName(), row.getPhone(), row.getSource(), row.getCourseInterested(),
            row.getStatus(), row.getCounsellorName(), row.getCreatedAt(), row.getConvertedAt(),
            row.getDaysToConvert() < 0 ? "N/A" : row.getDaysToConvert(), row.getAdmissionValue()
        }).toArray(Object[][]::new);
        return export(fmt, "enquiry-conversion", headers, data);
    }

    // ── Shared export logic ──────────────────────────────────────────────────

    private ResponseEntity<byte[]> export(String fmt, String name, String[] headers, Object[][] rows) throws IOException {
        if ("xlsx".equalsIgnoreCase(fmt)) return exportExcel(name, headers, rows);
        return exportCsv(name, headers, rows);
    }

    private ResponseEntity<byte[]> exportCsv(String name, String[] headers, Object[][] rows) {
        StringBuilder sb = new StringBuilder();
        sb.append(String.join(",", headers)).append("\n");
        for (Object[] row : rows) {
            StringBuilder line = new StringBuilder();
            for (int i = 0; i < row.length; i++) {
                if (i > 0) line.append(",");
                String val = row[i] == null ? "" : row[i].toString();
                if (val.contains(",") || val.contains("\"") || val.contains("\n")) {
                    val = "\"" + val.replace("\"", "\"\"") + "\"";
                }
                line.append(val);
            }
            sb.append(line).append("\n");
        }
        byte[] bytes = sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + name + ".csv\"")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(bytes);
    }

    private ResponseEntity<byte[]> exportExcel(String name, String[] headers, Object[][] rows) throws IOException {
        try (var wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Report");

            // Header style
            CellStyle hStyle = wb.createCellStyle();
            hStyle.setFillForegroundColor(IndexedColors.DARK_TEAL.getIndex());
            hStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font hFont = wb.createFont();
            hFont.setColor(IndexedColors.WHITE.getIndex());
            hFont.setBold(true);
            hStyle.setFont(hFont);
            hStyle.setBorderBottom(BorderStyle.THIN);

            // Header row
            Row hRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell c = hRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(hStyle);
            }

            // Data rows
            CellStyle altStyle = wb.createCellStyle();
            altStyle.setFillForegroundColor(IndexedColors.LIGHT_TURQUOISE.getIndex());
            altStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            for (int r = 0; r < rows.length; r++) {
                Row row = sheet.createRow(r + 1);
                for (int c = 0; c < rows[r].length; c++) {
                    Cell cell = row.createCell(c);
                    Object val = rows[r][c];
                    if (val == null) {
                        cell.setCellValue("");
                    } else if (val instanceof Number n) {
                        cell.setCellValue(n.doubleValue());
                    } else {
                        cell.setCellValue(val.toString());
                    }
                    if (r % 2 == 1) cell.setCellStyle(altStyle);
                }
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + name + ".xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(out.toByteArray());
        }
    }

    private static DateRange range(String from, String to) {
        LocalDate f = from != null && !from.isBlank() ? LocalDate.parse(from) : YearMonth.now().atDay(1);
        LocalDate t = to   != null && !to.isBlank()   ? LocalDate.parse(to)   : LocalDate.now();
        return new DateRange(f, t);
    }

    private record DateRange(LocalDate from, LocalDate to) {}
}
