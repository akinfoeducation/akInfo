package com.akt.institute.lead.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LeadSummaryResponse {

    private Long id;
    private String firstName;
    private String lastName;
    private String fullName;
    private String phone;
    private String email;
    private String courseInterested;
    private String source;
    private String status;
    private Instant nextFollowUpAt;
    private Instant lastContactedAt;
    private Instant createdAt;
}
