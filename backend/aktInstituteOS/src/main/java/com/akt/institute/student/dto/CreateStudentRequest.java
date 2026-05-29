package com.akt.institute.student.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateStudentRequest {

    @NotBlank(message = "First name is required")
    @Size(max = 100)
    private String firstName;

    @Size(max = 100)
    private String lastName;

    @Email(message = "Invalid email format")
    @Size(max = 255)
    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid Indian mobile number")
    private String phone;

    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid WhatsApp number")
    private String whatsappNumber;

    private LocalDate dateOfBirth;

    @Pattern(regexp = "MALE|FEMALE|OTHER", message = "Gender must be MALE, FEMALE, or OTHER")
    private String gender;

    @Size(max = 500)
    private String address;

    @Size(max = 100)
    private String city;

    @Size(max = 100)
    private String state;

    @Size(max = 10)
    private String pincode;

    @Size(max = 200)
    private String parentName;

    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid parent phone number")
    private String parentPhone;

    @Email(message = "Invalid parent email format")
    private String parentEmail;

    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid emergency contact")
    private String emergencyContact;

    @Size(max = 200)
    private String highestQualification;

    @Size(max = 300)
    private String schoolCollegeName;

    @Pattern(regexp = "^\\d{12}$", message = "Aadhaar number must be exactly 12 digits")
    private String aadhaarNumber;

    @Pattern(regexp = "^[A-Z]{5}[0-9]{4}[A-Z]$", message = "Invalid PAN format (example: ABCDE1234F)")
    private String panNumber;

    private String notes;

    // Optional: link to a lead that was converted
    private Long leadId;
}
