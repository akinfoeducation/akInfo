package com.akt.institute.lead.service;

import com.akt.institute.admission.repository.AdmissionDao;
import com.akt.institute.lead.domain.Lead;
import com.akt.institute.lead.domain.LeadSource;
import com.akt.institute.lead.domain.LeadStatus;
import com.akt.institute.lead.dto.*;
import com.akt.institute.lead.mapper.LeadMapper;
import com.akt.institute.lead.repository.LeadDao;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.dto.PageMeta;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.DuplicateResourceException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import com.akt.institute.shared.util.DateTimeUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeadService {

    private final LeadDao leadDao;
    private final LeadMapper leadMapper;
    private final AdmissionDao admissionDao;

    // ── Create ──────────────────────────────────────────────────────────────

    @Transactional
    public LeadResponse create(CreateLeadRequest request, Long instituteId) {
        if (leadDao.existsByPhoneAndInstituteId(request.getPhone(), instituteId)) {
            throw new DuplicateResourceException("Lead", "phone", request.getPhone());
        }

        Lead lead = leadMapper.toEntity(request);
        lead.setUuid(UUID.randomUUID().toString());
        lead.setInstituteId(instituteId);
        lead.setStatus(LeadStatus.NEW);
        lead.setSource(parseSource(request.getSource()));
        lead.setNextFollowUpAt(DateTimeUtil.parseFlexible(request.getNextFollowUpAt()));

        Lead saved = leadDao.save(lead);
        log.info("Lead created: id={}, phone={}", saved.getId(), saved.getPhone());
        return leadMapper.toResponse(saved);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public LeadResponse getById(Long id, Long instituteId) {
        Lead lead = findOrThrow(id, instituteId);
        LeadResponse response = leadMapper.toResponse(lead);
        // Attach admissionId so the frontend can show "View Admission" instead of "Create Admission"
        admissionDao.findAdmissionIdByLeadId(id, instituteId)
            .ifPresent(response::setAdmissionId);
        return response;
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<LeadSummaryResponse>> list(
        Long instituteId, String status, String source, String q,
        int page, int size, String sortField, String sortDir
    ) {
        List<Lead> leads = leadDao.findWithFilters(instituteId, status, source, q, page, size, sortField, sortDir);
        long total = leadDao.countWithFilters(instituteId, status, source, q);
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

    // ── Update ──────────────────────────────────────────────────────────────

    @Transactional
    public LeadResponse update(Long id, UpdateLeadRequest request, Long instituteId) {
        Lead lead = findOrThrow(id, instituteId);

        if (request.getPhone() != null) {
            if (leadDao.existsByPhoneAndInstituteIdAndIdNot(request.getPhone(), instituteId, id)) {
                throw new DuplicateResourceException("Lead", "phone", request.getPhone());
            }
        }
        if (request.getSource() != null) {
            lead.setSource(parseSource(request.getSource()));
        }

        leadMapper.updateEntity(lead, request);
        if (request.getNextFollowUpAt() != null) {
            lead.setNextFollowUpAt(DateTimeUtil.parseFlexible(request.getNextFollowUpAt()));
        }
        Lead saved = leadDao.save(lead);
        return leadMapper.toResponse(saved);
    }

    // ── Status ──────────────────────────────────────────────────────────────

    @Transactional
    public LeadResponse updateStatus(Long id, UpdateLeadStatusRequest request, Long instituteId) {
        Lead lead = findOrThrow(id, instituteId);
        LeadStatus newStatus = parseStatus(request.getStatus());

        if (newStatus == LeadStatus.CONVERTED) {
            throw new BusinessException(
                "Use the /convert endpoint to convert a lead to admission", "USE_CONVERT_ENDPOINT", HttpStatus.BAD_REQUEST);
        }

        lead.setStatus(newStatus);
        if (newStatus == LeadStatus.CONTACTED || newStatus == LeadStatus.FOLLOW_UP
            || newStatus == LeadStatus.DEMO_SCHEDULED || newStatus == LeadStatus.NEGOTIATION) {
            lead.setLastContactedAt(Instant.now());
        }

        Lead saved = leadDao.save(lead);
        log.info("Lead {} status changed to {}", id, newStatus);
        return leadMapper.toResponse(saved);
    }

    // ── Convert ─────────────────────────────────────────────────────────────

    @Transactional
    public LeadResponse convert(Long id, Long instituteId) {
        Lead lead = findOrThrow(id, instituteId);

        if (lead.getStatus() == LeadStatus.CONVERTED) {
            throw new BusinessException("Lead is already converted", "LEAD_ALREADY_CONVERTED", HttpStatus.CONFLICT);
        }
        if (lead.getStatus() == LeadStatus.LOST) {
            throw new BusinessException("Cannot convert a lost lead", "LEAD_IS_LOST", HttpStatus.BAD_REQUEST);
        }

        lead.setStatus(LeadStatus.CONVERTED);
        lead.setConvertedAt(Instant.now());

        Lead saved = leadDao.save(lead);
        log.info("Lead {} converted at {}", id, saved.getConvertedAt());
        return leadMapper.toResponse(saved);
    }

    // ── Delete ──────────────────────────────────────────────────────────────

    @Transactional
    public void delete(Long id, Long instituteId) {
        Lead lead = findOrThrow(id, instituteId);
        lead.setDeletedAt(Instant.now());
        leadDao.save(lead);
        log.info("Lead soft-deleted: id={}", id);
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private Lead findOrThrow(Long id, Long instituteId) {
        return leadDao.findByIdAndInstituteId(id, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Lead", id));
    }

    private static LeadStatus parseStatus(String value) {
        try {
            return LeadStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(
                "Invalid status '" + value + "'. Valid values: " + Arrays.toString(LeadStatus.values()),
                "INVALID_LEAD_STATUS", HttpStatus.BAD_REQUEST);
        }
    }

    private static LeadSource parseSource(String value) {
        if (value == null || value.isBlank()) return LeadSource.WALK_IN;
        try {
            return LeadSource.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(
                "Invalid source '" + value + "'. Valid values: " + Arrays.toString(LeadSource.values()),
                "INVALID_LEAD_SOURCE", HttpStatus.BAD_REQUEST);
        }
    }
}
