package com.akt.institute.user.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.Set;

@Data
public class UpdateUserRequest {

    @NotBlank(message = "First name is required")
    @Size(max = 100)
    private String firstName;

    @Size(max = 100)
    private String lastName;

    @Email @Size(max = 255)
    private String email;

    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Must be a valid 10-digit Indian mobile number")
    private String phone;

    @Size(max = 50)
    private String employeeId;

    @Size(max = 200)
    private String designation;

    @Pattern(regexp = "MALE|FEMALE|OTHER")
    private String gender;

    private LocalDate dateOfBirth;
    private LocalDate joiningDate;
    private String    address;

    private Long branchId;
    private Long departmentId;

    /** If provided, replaces all current roles. */
    private Set<Long> roleIds;
}
