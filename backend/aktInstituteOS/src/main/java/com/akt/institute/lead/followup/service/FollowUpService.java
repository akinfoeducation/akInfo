package com.akt.institute.lead.followup.service;

import com.akt.institute.lead.domain.Lead;
import com.akt.institute.lead.followup.domain.FollowUp;
import com.akt.institute.lead.followup.dto.CreateFollowUpRequest;
import com.akt.institute.lead.followup.dto.FollowUpResponse;
import com.akt.institute.lead.followup.repository.FollowUpDao;
import com.akt.institute.lead.repository.LeadDao;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import com.akt.institute.shared.util.DateTimeUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class FollowUpService {

    private final FollowUpDao followUpDao;
    private final LeadDao leadDao;

    @Transactional
    public FollowUpResponse create(Long leadId, Long instituteId, Long actorId,
                                   boolean hasAssignPermission, CreateFollowUpRequest request) {
        Lead lead = leadDao.findByIdAndInstituteId(leadId, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Lead", leadId));

        // Callers can only schedule follow-ups for their own assigned leads
        if (!hasAssignPermission && !Objects.equals(lead.getAssignedToId(), actorId)) {
            throw new BusinessException(
                "You can only schedule follow-ups for leads assigned to you",
                "ACCESS_DENIED", HttpStatus.FORBIDDEN);
        }

        FollowUp followUp = FollowUp.builder()
            .instituteId(instituteId)
            .leadId(leadId)
            .scheduledAt(DateTimeUtil.parseFlexible(request.getScheduledAt()))
            .remarks(request.getRemarks())
            .done(false)
            .createdBy(actorId)
            .build();

        return toResponse(followUpDao.save(followUp));
    }

    @Transactional(readOnly = true)
    public List<FollowUpResponse> listForLead(Long leadId, Long instituteId) {
        return followUpDao.findByLeadId(leadId, instituteId)
            .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<FollowUpResponse> listPending(Long userId, Long instituteId) {
        return followUpDao.findPendingByCreatedBy(userId, instituteId)
            .stream().map(this::toResponse).toList();
    }

    @Transactional
    public FollowUpResponse markDone(Long id, Long instituteId, Long actorId, boolean hasAssignPermission) {
        FollowUp followUp = followUpDao.findByIdAndInstituteId(id, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("FollowUp", id));

        // Only the creator or an admin can mark a follow-up done
        if (!hasAssignPermission && !Objects.equals(followUp.getCreatedBy(), actorId)) {
            throw new BusinessException(
                "You can only update your own follow-ups", "ACCESS_DENIED", HttpStatus.FORBIDDEN);
        }

        followUp.setDone(true);
        followUp.setCompletedAt(Instant.now());
        return toResponse(followUpDao.save(followUp));
    }

    private FollowUpResponse toResponse(FollowUp f) {
        return FollowUpResponse.builder()
            .id(f.getId())
            .leadId(f.getLeadId())
            .scheduledAt(f.getScheduledAt())
            .remarks(f.getRemarks())
            .done(f.isDone())
            .completedAt(f.getCompletedAt())
            .createdBy(f.getCreatedBy())
            .createdAt(f.getCreatedAt())
            .build();
    }
}
