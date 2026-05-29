package com.akt.institute.student.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Lightweight projection for list views and search results.
 * Avoids loading documents and heavy fields.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StudentSummaryResponse {

    private Long id;
    private String studentNumber;
    private String firstName;
    private String lastName;
    private String fullName;
    private String phone;
    private String email;
    private String city;
    private String status;
    private String photoUrl;
    private Instant createdAt;
}
