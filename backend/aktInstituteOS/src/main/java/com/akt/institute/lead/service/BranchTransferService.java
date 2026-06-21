package com.akt.institute.lead.service;

import com.akt.institute.branch.domain.Branch;
import com.akt.institute.branch.dto.BranchResponse;
import com.akt.institute.branch.repository.BranchDao;
import com.akt.institute.lead.activity.service.LeadActivityService;
import com.akt.institute.lead.domain.*;
import com.akt.institute.lead.dto.*;
import com.akt.institute.lead.mapper.LeadMapper;
import com.akt.institute.auth.repository.UserDao;
import com.akt.institute.lead.repository.LeadDao;
import com.akt.institute.lead.repository.LeadTransferDao;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Handles branch transfers and branch listing.
 *
 * Transfer flow:
 *  1. Caller clicks "Transfer to Patna Branch".
 *  2. Lead's assigned_to_id is cleared, branch_id is set, status → CLOSED (for this branch).
 *  3. Transfer record is written to lead_transfers.
 *  4. Activity is logged.
 *
 * Patna branch team sees transferred leads via ?branchId= filter.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BranchTransferService {

    private final LeadDao             leadDao;
    private final BranchDao           branchDao;   // existing com.akt.institute.branch.repository.BranchDao
    private final LeadTransferDao     transferDao;
    private final LeadActivityService activityService;
    private final LeadMapper          leadMapper;
    private final UserDao             userDao;
    private final com.akt.institute.booking.repository.AdmissionBookingDao bookingDao;

    /** Resolves a user id to a display name, or null. */
    private String userName(Long id) {
        if (id == null) return null;
        return userDao.findById(id).map(com.akt.institute.auth.domain.User::getFullName).orElse(null);
    }

    // ── List Branches ─────────────────────────────────────────────────────────

    public List<BranchResponse> listBranches(Long instituteId) {
        return branchDao.findAllByInstituteId(instituteId).stream()
            .filter(Branch::isActive)
            .map(b -> BranchResponse.builder()
                .id(b.getId())
                .uuid(b.getUuid())
                .instituteId(b.getInstituteId())
                .name(b.getName())
                .code(b.getCode())
                .address(b.getAddress())
                .city(b.getCity())
                .phone(b.getPhone())
                .email(b.getEmail())
                .active(b.isActive())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .build())
            .collect(Collectors.toList());
    }

    // ── Transfer to Branch ────────────────────────────────────────────────────

    @Transactional
    public LeadResponse transferToBranch(Long leadId, TransferBranchRequest request,
                                         Long instituteId, Long actorId) {
        Lead lead = leadDao.findByIdAndInstituteId(leadId, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Lead", leadId));

        Branch branch = branchDao.findByIdAndInstituteId(request.getBranchId(), instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Branch", request.getBranchId()));

        if (!branch.isActive()) {
            throw new BusinessException("Branch is not active", "BRANCH_INACTIVE", HttpStatus.BAD_REQUEST);
        }

        if (lead.getBranchId() != null && lead.getBranchId().equals(branch.getId())) {
            throw new BusinessException(
                "Lead is already transferred to this branch", "ALREADY_TRANSFERRED", HttpStatus.CONFLICT);
        }

        Long previousCaller = lead.getAssignedToId();

        // Preserve previous caller for same-number routing
        if (previousCaller != null) {
            lead.setPreviousCallerId(previousCaller);
        }

        // Release any active booking's reserved seat (C3): the lead is leaving this branch, so a
        // seat it confirmed here must be returned to the pool. The booking is cancelled too, so the
        // receiving branch starts the lead fresh.
        bookingDao.findActiveByLeadId(leadId, instituteId).ifPresent(booking -> {
            if (booking.getBookingStatus() == com.akt.institute.booking.domain.BookingStatus.BOOKING_CONFIRMED) {
                bookingDao.restoreSeat(booking.getBatchId());
            }
            bookingDao.cancelBooking(booking.getId(), actorId, "Lead transferred to another branch");
        });

        // Close out caller ownership; set branch
        lead.setAssignedToId(null);
        lead.setAssignedAt(null);
        lead.setBranchId(branch.getId());
        lead.setStatus(LeadStatus.CLOSED);
        Lead saved = leadDao.save(lead);

        // Record transfer history
        transferDao.record(LeadTransfer.builder()
            .leadId(leadId)
            .instituteId(instituteId)
            .transferType("BRANCH_TRANSFER")
            .fromCallerId(previousCaller)
            .toBranchId(branch.getId())
            .notes(request.getNotes())
            .transferredBy(actorId)
            .build());

        activityService.record(leadId, instituteId, "BRANCH_TRANSFER",
            "Lead transferred to " + branch.getName() +
            (request.getNotes() != null ? ". Notes: " + request.getNotes() : ""),
            actorId);

        log.info("Lead {} transferred to branch {} ({}) by actor {}",
            leadId, branch.getId(), branch.getName(), actorId);

        return leadMapper.toResponse(saved);
    }

    // ── Transfer History ─────────────────────────────────────────────────────

    public List<LeadTransferResponse> getTransferHistory(Long leadId, Long instituteId) {
        return transferDao.findByLeadId(leadId, instituteId).stream()
            .map(t -> {
                String branchName = null;
                if (t.getToBranchId() != null) {
                    branchName = branchDao.findByIdAndInstituteId(t.getToBranchId(), instituteId)
                        .map(Branch::getName).orElse(null);
                }
                return LeadTransferResponse.builder()
                    .id(t.getId())
                    .transferType(t.getTransferType())
                    .fromCallerId(t.getFromCallerId())
                    .fromCallerName(userName(t.getFromCallerId()))
                    .toCallerId(t.getToCallerId())
                    .toCallerName(userName(t.getToCallerId()))
                    .toBranchId(t.getToBranchId())
                    .toBranchName(branchName)
                    .notes(t.getNotes())
                    .transferredAt(t.getTransferredAt())
                    .transferredBy(t.getTransferredBy())
                    .build();
            })
            .collect(Collectors.toList());
    }
}
