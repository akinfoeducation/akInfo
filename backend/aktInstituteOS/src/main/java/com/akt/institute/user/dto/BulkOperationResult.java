package com.akt.institute.user.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data @Builder
public class BulkOperationResult {
    private int          totalRequested;
    private int          succeeded;
    private int          failed;
    private List<String> errors;
}
