package com.akt.institute.lead.activity.repository;

import com.akt.institute.lead.activity.domain.LeadActivity;

import java.util.List;

public interface LeadActivityDao {
    void record(LeadActivity activity);
    List<LeadActivity> findByLeadId(Long leadId, Long instituteId);
}
