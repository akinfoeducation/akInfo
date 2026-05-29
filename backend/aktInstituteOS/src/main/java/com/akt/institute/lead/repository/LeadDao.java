package com.akt.institute.lead.repository;

import com.akt.institute.lead.domain.Lead;
import com.akt.institute.lead.domain.LeadStatus;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface LeadDao {

    Lead save(Lead lead);

    Optional<Lead> findByIdAndInstituteId(Long id, Long instituteId);

    boolean existsByPhoneAndInstituteId(String phone, Long instituteId);

    boolean existsByPhoneAndInstituteIdAndIdNot(String phone, Long instituteId, Long excludeId);

    List<Lead> findWithFilters(Long instituteId, String status, String source, String q,
                               int page, int size, String sortField, String sortDir);

    long countWithFilters(Long instituteId, String status, String source, String q);

    List<Lead> findOverdueFollowups(Long instituteId, Instant before);

    long countByInstituteIdAndStatus(Long instituteId, LeadStatus status);
}
