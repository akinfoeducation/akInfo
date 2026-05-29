package com.akt.institute.report.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** One slice of the lead funnel — by status or by source. */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class LeadFunnelItem {
    private String label;   // status name (e.g. "NEW") or source name
    private long count;
    private double percent; // share of total leads in period
}
