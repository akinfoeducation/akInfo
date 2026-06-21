package com.akt.institute.lead.service;

import com.akt.institute.lead.activity.service.LeadActivityService;
import com.akt.institute.lead.domain.*;
import com.akt.institute.lead.dto.*;
import com.akt.institute.lead.mapper.LeadMapper;
import com.akt.institute.lead.repository.LeadDao;
import com.akt.institute.lead.repository.LeadTransferDao;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.dto.PageMeta;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Handles the NOT_CONNECTED Retry Pool workflow.
 *
 * Flow:
 *  1. Caller marks lead NOT_CONNECTED via the guarded CALL_NOT_CONNECTED workflow
 *     action (LeadWorkflowService) → not_connected_at is stamped.
 *  2. After RETRY_DELAY_MINUTES, lead appears in the shared retry pool.
 *  3. Any caller can claim a lead from the pool (atomic single ownership).
 *  4. Claiming sets assigned_to_id = claimant, status = ASSIGNED, removes from pool.
 *
 * NOTE: there is no direct markNotConnected() here — the only way to set NOT_CONNECTED
 * is the ownership/phase/ALLOWED_FROM-guarded CALL_NOT_CONNECTED action (C4 backdoor removed).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RetryPoolService {

    static final int RETRY_DELAY_MINUTES = 30;
    private static final int DEFAULT_PAGE_SIZE = 20;

    private final LeadDao             leadDao;
    private final LeadMapper          leadMapper;
    private final LeadActivityService activityService;
    private final LeadTransferDao     transferDao;

    // ── Retry Pool List ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ApiResponse<List<LeadSummaryResponse>> listRetryPool(Long instituteId, int page, int size) {
        size = Math.min(size, 100);
        List<Lead> leads = leadDao.findRetryPool(instituteId, RETRY_DELAY_MINUTES, page, size);
        long total = leadDao.countRetryPool(instituteId, RETRY_DELAY_MINUTES);
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / size);

        return ApiResponse.paged(
            leadMapper.toSummaryList(leads),
            PageMeta.builder()
                .page(page).size(size).total(total).totalPages(totalPages)
                .hasNext((long) (page + 1) * size < total)
                .hasPrevious(page > 0)
                .build()
        );
    }

    // ── Claim from Pool ───────────────────────────────────────────────────────

    @Transactional
    public LeadResponse claimFromPool(Long leadId, Long callerId, Long instituteId) {
        // Verify lead exists and belongs to institute
        Lead lead = leadDao.findByIdAndInstituteId(leadId, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Lead", leadId));

        if (lead.getStatus() != LeadStatus.NOT_CONNECTED) {
            throw new BusinessException(
                "Lead is no longer in the retry pool (status: " + lead.getStatus() + ")",
                "LEAD_NOT_IN_POOL", HttpStatus.CONFLICT);
        }

        Long previousCaller = lead.getAssignedToId();

        // Atomic claim — WHERE clause ensures no double-claim
        int updated = leadDao.claimFromPool(leadId, callerId, callerId);
        if (updated == 0) {
            throw new BusinessException(
                "Lead was already claimed by another caller or is not yet eligible for retry.",
                "POOL_CLAIM_FAILED", HttpStatus.CONFLICT);
        }

        // Record transfer history
        transferDao.record(LeadTransfer.builder()
            .leadId(leadId)
            .instituteId(instituteId)
            .transferType("POOL_CLAIM")
            .fromCallerId(previousCaller)
            .toCallerId(callerId)
            .transferredBy(callerId)
            .build());

        activityService.record(leadId, instituteId, "POOL_CLAIMED",
            "Lead claimed from retry pool by caller ID " + callerId +
            (previousCaller != null ? " (previous owner: " + previousCaller + ")" : ""),
            callerId);

        log.info("Lead {} claimed from pool by caller {}", leadId, callerId);

        // Re-fetch to get updated state
        return leadMapper.toResponse(
            leadDao.findByIdAndInstituteId(leadId, instituteId).orElseThrow());
    }
}
