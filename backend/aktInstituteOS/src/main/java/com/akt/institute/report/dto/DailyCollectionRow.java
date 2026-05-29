package com.akt.institute.report.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data @AllArgsConstructor @NoArgsConstructor
public class DailyCollectionRow {
    private String date;           // yyyy-MM-dd
    private String dayLabel;       // "Mon, 29 May"
    private long   receipts;
    private BigDecimal collected;
    private BigDecimal expenses;
    private BigDecimal net;
}
