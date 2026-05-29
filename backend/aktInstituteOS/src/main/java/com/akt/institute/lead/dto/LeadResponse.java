package com.akt.institute.lead.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LeadResponse {

    private Long id;
    private String uuid;
    private Long admissionId;   // set when an admission exists for this lead
    private String firstName;
    private String lastName;
    private String fullName;
    private String phone;
    private String whatsappNumber;
    private String email;
    private String courseInterested;
    private String source;
    private String status;
    private Long assignedToId;
    private String notes;
    private Instant nextFollowUpAt;
    private Instant lastContactedAt;
    private Instant convertedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
