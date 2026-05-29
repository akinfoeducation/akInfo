package com.akt.institute.admission.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateAdmissionRequest {

    @NotNull(message = "Lead ID is required")
    private Long leadId;

    @NotBlank(message = "First name is required")
    @Size(max = 100)
    private String firstName;

    @Size(max = 100)
    private String lastName;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid Indian mobile number")
    private String phone;

    @Email(message = "Invalid email format")
    @Size(max = 255)
    private String email;

    @Size(max = 200)
    private String courseName;

    private Long batchId;

    @Size(max = 200)
    private String batchName;

    @DecimalMin(value = "0.0", message = "Fees agreed must be non-negative")
    private BigDecimal feesAgreed;

    private LocalDate enrollmentDate;

    @Size(max = 2000)
    private String notes;
}
