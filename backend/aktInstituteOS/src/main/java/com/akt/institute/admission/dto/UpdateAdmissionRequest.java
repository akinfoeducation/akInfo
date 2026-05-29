package com.akt.institute.admission.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UpdateAdmissionRequest {

    @Size(max = 100)
    private String firstName;

    @Size(max = 100)
    private String lastName;

    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid Indian mobile number")
    private String phone;

    @Email(message = "Invalid email format")
    @Size(max = 255)
    private String email;

    @Size(max = 200)
    private String courseName;

    @Size(max = 200)
    private String batchName;

    @DecimalMin(value = "0.0", message = "Fees agreed must be non-negative")
    private BigDecimal feesAgreed;

    @DecimalMin(value = "0.0", message = "Fees paid must be non-negative")
    private BigDecimal feesPaid;

    private LocalDate enrollmentDate;

    @Size(max = 2000)
    private String notes;
}
