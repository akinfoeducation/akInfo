package com.akt.institute.admission.repository;

import com.akt.institute.admission.domain.Admission;
import com.akt.institute.admission.domain.AdmissionStatus;

import java.util.List;
import java.util.Optional;

public interface AdmissionDao {

    Admission save(Admission admission);

    Optional<Admission> findByIdAndInstituteId(Long id, Long instituteId);

    boolean existsByLeadIdAndInstituteId(Long leadId, Long instituteId);

    java.util.Optional<Long> findAdmissionIdByLeadId(Long leadId, Long instituteId);

    List<Admission> findWithFilters(Long instituteId, String status, String q, boolean hasDues,
                                    int page, int size, String sortField, String sortDir);

    long countWithFilters(Long instituteId, String status, String q, boolean hasDues);

    long countByInstituteIdAndStatus(Long instituteId, AdmissionStatus status);
}
