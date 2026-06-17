package com.akt.institute.lead.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BulkAssignResult {
    private int requested;
    private int assigned;       // newly assigned (was unassigned before)
    private int reassigned;     // had a different caller, now moved
    private int skipped;        // same caller already — no change needed
    private int notFound;       // lead ID not found in this institute
    private List<String> errors;
}
