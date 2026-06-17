package com.akt.institute.lead.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class UpdateLeadRequest {

    @Size(max = 100)
    private String firstName;

    @Size(max = 100)
    private String lastName;

    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid Indian mobile number")
    private String phone;

    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid WhatsApp number")
    private String whatsappNumber;

    @Email(message = "Invalid email format")
    @Size(max = 255)
    private String email;

    @Size(max = 200)
    private String courseInterested;

    private String source;

    private String deliveryMode;

    @Size(max = 200)
    private String preferredBatch;

    @Size(max = 200)
    private String preferredBranch;

    @Size(max = 100)
    private String parentName;

    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid parent mobile number")
    private String parentPhone;

    @Email(message = "Invalid parent email format")
    @Size(max = 255)
    private String parentEmail;

    private String address;

    private String currentWork;

    private String interestedFor;

    @Size(max = 2000)
    private String notes;

    private String nextFollowUpAt;
}
