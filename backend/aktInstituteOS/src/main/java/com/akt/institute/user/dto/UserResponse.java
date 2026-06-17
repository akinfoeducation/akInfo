package com.akt.institute.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponse {

    private Long    id;
    private String  uuid;
    private Long    instituteId;
    private String  instituteName;

    // Identity
    private String  username;
    private String  email;
    private String  firstName;
    private String  lastName;
    private String  fullName;
    private String  phone;
    private String  avatarUrl;

    // Professional
    private String  employeeId;
    private String  designation;
    private String  gender;
    private LocalDate dateOfBirth;
    private LocalDate joiningDate;
    private String  address;

    // Organisational
    private Long    branchId;
    private String  branchName;
    private Long    departmentId;
    private String  departmentName;

    // RBAC
    private Set<RoleSummary> roles;

    // Status & security
    private boolean active;
    private boolean emailVerified;
    private Instant lastLoginAt;
    private boolean locked;
    private int     failedLoginAttempts;

    // Audit
    private Instant createdAt;
    private Instant updatedAt;
    private Long    createdBy;
    private Long    updatedBy;

    @Data @Builder
    public static class RoleSummary {
        private Long   id;
        private String name;
        private String code;
        private boolean system;
    }
}
