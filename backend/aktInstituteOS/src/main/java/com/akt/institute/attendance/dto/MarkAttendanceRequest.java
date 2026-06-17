package com.akt.institute.attendance.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class MarkAttendanceRequest {
    @NotEmpty
    private List<AttendanceEntryRequest> entries;
}
