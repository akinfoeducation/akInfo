package com.akt.institute.lead.repository;

import com.akt.institute.lead.domain.LeadTransfer;

import java.util.List;

public interface LeadTransferDao {
    void record(LeadTransfer transfer);
    List<LeadTransfer> findByLeadId(Long leadId, Long instituteId);
}
