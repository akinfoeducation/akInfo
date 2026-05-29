package com.akt.institute.report.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data @AllArgsConstructor @NoArgsConstructor
public class BatchStudentReportRow {
    private String courseName;
    private String batchName;
    private long   totalAdmissions;
    private long   active;
    private long   completed;
    private long   cancelled;
    private BigDecimal totalFeesAgreed;
    private BigDecimal totalFeesPaid;
    private BigDecimal totalFeesDue;
}
