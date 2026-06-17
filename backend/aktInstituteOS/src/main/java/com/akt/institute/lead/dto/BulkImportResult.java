package com.akt.institute.lead.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class BulkImportResult {
    private int totalRows;
    private int createdRows;
    private int duplicateRows;
    private int invalidRows;
    private List<String> errors;
}
