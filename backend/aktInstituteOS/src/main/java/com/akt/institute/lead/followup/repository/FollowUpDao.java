package com.akt.institute.lead.followup.repository;

import com.akt.institute.lead.followup.domain.FollowUp;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface FollowUpDao {

    FollowUp save(FollowUp followUp);

    Optional<FollowUp> findByIdAndInstituteId(Long id, Long instituteId);

    List<FollowUp> findByLeadId(Long leadId, Long instituteId);

    List<FollowUp> findPendingByCreatedBy(Long createdBy, Long instituteId);

    List<FollowUp> findTodayByCreatedBy(Long createdBy, Long instituteId, Instant from, Instant to);

    long countPendingByCreatedBy(Long createdBy, Long instituteId);
}
