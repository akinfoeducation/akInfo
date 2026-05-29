package com.akt.institute.lead.domain;

import com.akt.institute.shared.domain.BaseEntity;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lead extends BaseEntity {

    private String uuid;
    private Long instituteId;
    private String firstName;
    private String lastName;
    private String phone;
    private String whatsappNumber;
    private String email;
    private String courseInterested;
    @Builder.Default
    private LeadSource source = LeadSource.WALK_IN;
    @Builder.Default
    private LeadStatus status = LeadStatus.NEW;
    private Long assignedToId;
    private String notes;
    private Instant nextFollowUpAt;
    private Instant lastContactedAt;
    private Instant convertedAt;

    public String getFullName() {
        return (lastName != null && !lastName.isBlank())
            ? firstName + " " + lastName
            : firstName;
    }
}
