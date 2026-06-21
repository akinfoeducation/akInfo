package com.akt.institute.lead.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateLeadRequest {

    // Name is optional at intake — leads from ads/imports often arrive with only a
    // number. When blank, the service falls back to the phone number as a placeholder
    // (the caller fills in the real name during qualification).
    @Size(max = 100)
    private String firstName;

    @Size(max = 100)
    private String lastName;

    @NotBlank(message = "Phone number is required")
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

    // Delivery mode is captured during qualification, not at intake — it's generally
    // unknown when the lead first arrives. It becomes required before the lead can be
    // advanced (visit/booking/handoff/admission), enforced in the workflow services.
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

    private Long assignedToId;

    private String address;

    private String currentWork;

    private String interestedFor;

    @Size(max = 2000)
    private String notes;

    private String nextFollowUpAt;
}
