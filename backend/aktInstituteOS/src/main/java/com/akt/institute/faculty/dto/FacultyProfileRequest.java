package com.akt.institute.faculty.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class FacultyProfileRequest {
    private String qualification;
    @Min(0) @Max(60)
    private int    experienceYears;
    private String subjects;
    private String skills;
    private String employeeType;
    private String bio;
    private String linkedinUrl;
}
