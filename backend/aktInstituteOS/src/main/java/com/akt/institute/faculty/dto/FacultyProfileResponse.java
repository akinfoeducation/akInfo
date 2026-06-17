package com.akt.institute.faculty.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class FacultyProfileResponse {
    private Long    id;
    private Long    userId;
    private Long    instituteId;
    private String  firstName;
    private String  lastName;
    private String  fullName;
    private String  email;
    private String  phone;
    private String  avatarUrl;
    private String  designation;
    private String  employeeId;
    private String  username;
    private String  qualification;
    private int     experienceYears;
    private String  subjects;
    private String  skills;
    private String  employeeType;
    private String  bio;
    private String  linkedinUrl;
    private Instant createdAt;
    private Instant updatedAt;
}
