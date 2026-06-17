package com.akt.institute.lead.service;

import com.akt.institute.lead.activity.service.LeadActivityService;
import com.akt.institute.lead.domain.DeliveryMode;
import com.akt.institute.lead.domain.Lead;
import com.akt.institute.lead.domain.LeadStatus;
import com.akt.institute.lead.domain.LeadTransfer;
import com.akt.institute.lead.dto.HandoffRequest;
import com.akt.institute.lead.dto.LeadResponse;
import com.akt.institute.lead.mapper.LeadMapper;
import com.akt.institute.lead.repository.LeadDao;
import com.akt.institute.lead.repository.LeadTransferDao;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Manages the Caller → Counsellor ownership handoff and walk-in self-claim.
 *
 * Ownership rule (V30):
 *  - Before VISIT_DONE: assigned_to_id = caller_id  (Caller owns)
 *  - After  VISIT_DONE: assigned_to_id = counsellor_id (Counsellor owns)
 *  - caller_id is NEVER cleared — used for KPI attribution
 *
 * Endpoints:
 *  POST /leads/{id}/handoff        — caller/admin hands off to counsellor
 *  POST /leads/{id}/claim-walk-in  — counsellor self-claims a walk-in/direct lead
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CounsellorHandoffService {

    private final LeadDao             leadDao;
    private final LeadMapper          leadMapper;
    private final LeadActivityService activityService;
    private final LeadTransferDao     transferDao;

    // ── Handoff to Counsellor ─────────────────────────────────────────────────

    @Transactional
    public LeadResponse handoffToCounsellor(Long leadId, HandoffRequest request,
                                             Long instituteId, Long actorId) {
        Lead lead = leadDao.findByIdAndInstituteId(leadId, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Lead", leadId));

        if (lead.getCounsellorId() != null) {
            throw new BusinessException(
                "Lead is already assigned to counsellor ID " + lead.getCounsellorId(),
                "ALREADY_HANDED_OFF", HttpStatus.CONFLICT);
        }

        // Delivery-mode-aware handoff gate
        DeliveryMode mode = lead.getDeliveryMode();
        if (mode == DeliveryMode.OFFLINE) {
            if (lead.getStatus() != LeadStatus.VISIT_DONE
                    && lead.getStatus() != LeadStatus.BOOKING_CONFIRMED) {
                throw new BusinessException(
                    "OFFLINE lead must reach VISIT_DONE or BOOKING_CONFIRMED before handoff. Current status: " + lead.getStatus(),
                    "INVALID_HANDOFF_STATUS", HttpStatus.BAD_REQUEST);
            }
        } else if (mode == DeliveryMode.ONLINE) {
            if (lead.getStatus() != LeadStatus.BOOKING_CONFIRMED) {
                throw new BusinessException(
                    "ONLINE lead must reach BOOKING_CONFIRMED before handoff. Current status: " + lead.getStatus(),
                    "INVALID_HANDOFF_STATUS", HttpStatus.BAD_REQUEST);
            }
        }

        Long previousOwnerId = lead.getAssignedToId(); // the caller who owned it

        // ONLINE leads skip the physical visit — use a dedicated DAO method that
        // does not stamp visit_done_at and keeps the status as BOOKING_CONFIRMED.
        int updated;
        if (mode == DeliveryMode.ONLINE) {
            updated = leadDao.handoffOnlineLead(leadId, request.getCounsellorId(), actorId);
        } else {
            updated = leadDao.handoffToCounsellor(leadId, request.getCounsellorId(), actorId);
        }
        if (updated == 0) {
            throw new BusinessException(
                "Handoff failed — lead not found or already deleted.",
                "HANDOFF_FAILED", HttpStatus.CONFLICT);
        }

        // Record in transfer history
        transferDao.record(LeadTransfer.builder()
            .leadId(leadId)
            .instituteId(instituteId)
            .transferType("COUNSELLOR_HANDOFF")
            .fromCallerId(previousOwnerId)
            .toCallerId(request.getCounsellorId())
            .notes(request.getNotes())
            .transferredBy(actorId)
            .build());

        activityService.record(leadId, instituteId, "COUNSELLOR_HANDOFF",
            "Lead handed off to counsellor ID " + request.getCounsellorId() +
            " — student visited institute" +
            (request.getNotes() != null ? ". Notes: " + request.getNotes() : ""),
            actorId);

        log.info("Lead {} handed off from caller {} to counsellor {} by actor {}",
            leadId, previousOwnerId, request.getCounsellorId(), actorId);

        return leadMapper.toResponse(
            leadDao.findByIdAndInstituteId(leadId, instituteId).orElseThrow());
    }

    // ── Walk-in Self-Claim ────────────────────────────────────────────────────

    @Transactional
    public LeadResponse claimWalkIn(Long leadId, Long counsellorId, Long instituteId) {
        Lead lead = leadDao.findByIdAndInstituteId(leadId, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Lead", leadId));

        if (lead.getCounsellorId() != null) {
            throw new BusinessException(
                "Lead already has a counsellor (ID " + lead.getCounsellorId() + ")",
                "ALREADY_CLAIMED", HttpStatus.CONFLICT);
        }

        int updated = leadDao.claimAsWalkIn(leadId, counsellorId, counsellorId);
        if (updated == 0) {
            throw new BusinessException(
                "Walk-in claim failed — lead was claimed by another counsellor simultaneously.",
                "WALK_IN_CLAIM_FAILED", HttpStatus.CONFLICT);
        }

        transferDao.record(LeadTransfer.builder()
            .leadId(leadId)
            .instituteId(instituteId)
            .transferType("WALK_IN_CLAIM")
            .fromCallerId(null)
            .toCallerId(counsellorId)
            .transferredBy(counsellorId)
            .build());

        activityService.record(leadId, instituteId, "WALK_IN_CLAIM",
            "Counsellor ID " + counsellorId + " claimed walk-in lead directly",
            counsellorId);

        log.info("Lead {} claimed as walk-in by counsellor {}", leadId, counsellorId);

        return leadMapper.toResponse(
            leadDao.findByIdAndInstituteId(leadId, instituteId).orElseThrow());
    }
}
