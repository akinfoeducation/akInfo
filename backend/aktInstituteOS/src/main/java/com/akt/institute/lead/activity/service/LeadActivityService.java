package com.akt.institute.lead.activity.service;

import com.akt.institute.lead.activity.domain.LeadActivity;
import com.akt.institute.lead.activity.dto.LeadActivityResponse;
import com.akt.institute.lead.activity.repository.LeadActivityDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LeadActivityService {

    private final LeadActivityDao activityDao;

    /** Legacy record — keeps backward compat for existing callers (assign, handoff, etc.) */
    public void record(Long leadId, Long instituteId, String actionType,
                       String description, Long performedBy) {
        activityDao.record(LeadActivity.builder()
            .leadId(leadId)
            .instituteId(instituteId)
            .actionType(actionType)
            .description(description)
            .performedBy(performedBy)
            .build());
    }

    /** Structured record — used by LeadWorkflowService for action-driven entries */
    public void recordStructured(Long leadId, Long instituteId,
                                  String leadAction, String category,
                                  String outcome, String description,
                                  Long performedBy) {
        activityDao.record(LeadActivity.builder()
            .leadId(leadId)
            .instituteId(instituteId)
            .actionType(leadAction)   // keep action_type = leadAction for backward compat
            .leadAction(leadAction)
            .actionCategory(category)
            .outcome(outcome)
            .description(description)
            .performedBy(performedBy)
            .build());
    }

    public List<LeadActivityResponse> listForLead(Long leadId, Long instituteId) {
        return activityDao.findByLeadId(leadId, instituteId)
            .stream()
            .map(a -> LeadActivityResponse.builder()
                .id(a.getId())
                .actionType(a.getActionType())
                .leadAction(a.getLeadAction())
                .actionCategory(a.getActionCategory())
                .outcome(a.getOutcome())
                .description(a.getDescription())
                .performedBy(a.getPerformedBy())
                .performedByName(a.getPerformedByName())
                .createdAt(a.getCreatedAt())
                .build())
            .toList();
    }
}
