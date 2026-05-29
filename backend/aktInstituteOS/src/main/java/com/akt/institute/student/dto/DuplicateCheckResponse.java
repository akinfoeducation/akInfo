package com.akt.institute.student.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DuplicateCheckResponse {
    private boolean phoneExists;
    private boolean emailExists;
    private boolean isDuplicate;
}
