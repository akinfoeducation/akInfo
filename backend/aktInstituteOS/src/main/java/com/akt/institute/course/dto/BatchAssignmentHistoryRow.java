package com.akt.institute.course.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.Instant;

@Data
@AllArgsConstructor
public class BatchAssignmentHistoryRow {
    private Long   id;
    private Long   admissionId;
    private Long   fromBatchId;
    private String fromBatchName;
    private Long   toBatchId;
    private String toBatchName;
    private String action;
    private String notes;
    private Instant createdAt;
    private String  createdByName;
}
