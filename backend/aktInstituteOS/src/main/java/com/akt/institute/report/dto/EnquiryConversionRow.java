package com.akt.institute.report.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class EnquiryConversionRow {
    private Long   id;
    private String leadName;
    private String phone;
    private String source;
    private String courseInterested;
    private String status;
    private String counsellorName;
    private String createdAt;
    private String convertedAt;
    private int    daysToConvert;    // -1 if not converted
    private BigDecimal admissionValue; // fees_agreed of resulting admission, 0 if not converted
}
