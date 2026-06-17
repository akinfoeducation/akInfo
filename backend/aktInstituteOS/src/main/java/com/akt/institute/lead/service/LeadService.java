package com.akt.institute.lead.service;

import com.akt.institute.admission.repository.AdmissionDao;
import com.akt.institute.lead.activity.service.LeadActivityService;
import com.akt.institute.lead.domain.*;
import com.akt.institute.lead.activity.dto.LeadActivityResponse;
import com.akt.institute.lead.dto.*;
import com.akt.institute.lead.mapper.LeadMapper;
import com.akt.institute.lead.repository.LeadDao;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.dto.PageMeta;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.DuplicateResourceException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import com.akt.institute.shared.security.UserPrincipal;
import com.akt.institute.shared.util.DateTimeUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import java.time.LocalDate;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeadService {

    private final LeadDao leadDao;
    private final LeadMapper leadMapper;
    private final AdmissionDao admissionDao;
    private final LeadActivityService activityService;

    // ── Create ──────────────────────────────────────────────────────────────

    @Transactional
    public LeadResponse create(CreateLeadRequest request, Long instituteId) {
        // Block only if an ACTIVE lead with this phone exists. A returning number
        // whose prior lead(s) are all dead/closed falls through to same-number
        // routing below (Scenario C9), which re-assigns it to the previous caller.
        if (leadDao.hasActiveLeadByPhone(request.getPhone(), instituteId)) {
            throw new DuplicateResourceException("Lead", "phone", request.getPhone());
        }

        Lead lead = leadMapper.toEntity(request);
        lead.setUuid(UUID.randomUUID().toString());
        lead.setInstituteId(instituteId);
        lead.setStatus(LeadStatus.NEW_LEAD);
        lead.setSource(parseSource(request.getSource()));
        lead.setCurrentWork(parseCurrentWork(request.getCurrentWork()));
        lead.setInterestedFor(parseInterestedFor(request.getInterestedFor()));
        lead.setNextFollowUpAt(DateTimeUtil.parseFlexible(request.getNextFollowUpAt()));

        // Same-number routing: if this number was seen within 90 days, route to the same caller
        applyReturnRouting(lead, instituteId);

        Lead saved = leadDao.save(lead);
        log.info("Lead created: id={}, phone={}", saved.getId(), saved.getPhone());
        return leadMapper.toResponse(saved);
    }

    // ── Bulk Import ─────────────────────────────────────────────────────────

    @Transactional
    public BulkImportResult bulkImport(MultipartFile file, Long instituteId) {
        int total = 0, created = 0, duplicates = 0, invalid = 0;
        List<String> errors = new ArrayList<>();

        try (Workbook wb = openWorkbook(file)) {
            Sheet sheet = wb.getSheetAt(0);
            for (Row row : sheet) {
                if (row.getRowNum() == 0) continue; // skip header
                total++;
                try {
                    String phone = extractPhone(row);
                    if (phone == null) { invalid++; errors.add("Row " + (row.getRowNum() + 1) + ": missing/invalid phone"); continue; }
                    // Only an ACTIVE lead counts as a duplicate; a returning dead/closed
                    // number falls through and is routed to its previous caller (C9).
                    if (leadDao.hasActiveLeadByPhone(phone, instituteId)) { duplicates++; continue; }

                    Lead lead = new Lead();
                    lead.setUuid(UUID.randomUUID().toString());
                    lead.setInstituteId(instituteId);
                    lead.setPhone(phone);
                    lead.setFirstName(phone); // temporary — caller fills in the real name after calling
                    lead.setStatus(LeadStatus.NEW_LEAD);
                    lead.setSource(LeadSource.WALK_IN);
                    // Same-number routing: auto-assign to previous caller within 90 days
                    applyReturnRouting(lead, instituteId);
                    leadDao.save(lead);
                    created++;
                } catch (Exception e) {
                    invalid++;
                    errors.add("Row " + (row.getRowNum() + 1) + ": " + e.getMessage());
                }
            }
        } catch (IOException e) {
            throw new BusinessException("Failed to read file: " + e.getMessage(), "FILE_READ_ERROR", HttpStatus.BAD_REQUEST);
        }

        log.info("Bulk import complete: total={}, created={}, duplicates={}, invalid={}", total, created, duplicates, invalid);
        return new BulkImportResult(total, created, duplicates, invalid, errors);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public LeadResponse getById(Long id, Long instituteId) {
        Lead lead = findOrThrow(id, instituteId);
        LeadResponse response = leadMapper.toResponse(lead);
        admissionDao.findAdmissionIdByLeadId(id, instituteId)
            .ifPresent(response::setAdmissionId);
        return response;
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<LeadSummaryResponse>> list(
        Long instituteId, String status, String stage, String source, String q,
        Long assignedToId, LocalDate from, LocalDate to,
        int page, int size, String sortField, String sortDir
    ) {
        List<Lead> leads = leadDao.findWithFilters(instituteId, status, stage, source, q, assignedToId, from, to, page, size, sortField, sortDir);
        long total = leadDao.countWithFilters(instituteId, status, stage, source, q, assignedToId, from, to);
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
    public LeadResponse update(Long id, UpdateLeadRequest request, Long instituteId, UserPrincipal principal) {
        Lead lead = findOrThrow(id, instituteId);
        enforceOwnership(lead, principal);

        if (request.getPhone() != null) {
            if (leadDao.existsByPhoneAndInstituteIdAndIdNot(request.getPhone(), instituteId, id)) {
                throw new DuplicateResourceException("Lead", "phone", request.getPhone());
            }
        }
        if (request.getSource() != null) lead.setSource(parseSource(request.getSource()));
        if (request.getCurrentWork() != null) lead.setCurrentWork(parseCurrentWork(request.getCurrentWork()));
        if (request.getInterestedFor() != null) lead.setInterestedFor(parseInterestedFor(request.getInterestedFor()));

        leadMapper.updateEntity(lead, request);
        if (request.getNextFollowUpAt() != null) {
            lead.setNextFollowUpAt(DateTimeUtil.parseFlexible(request.getNextFollowUpAt()));
        }
        Lead saved = leadDao.save(lead);
        return leadMapper.toResponse(saved);
    }

    // ── Status ──────────────────────────────────────────────────────────────

    @Transactional
    public LeadResponse updateStatus(Long id, UpdateLeadStatusRequest request, Long instituteId, UserPrincipal principal) {
        Lead lead = findOrThrow(id, instituteId);
        enforceOwnership(lead, principal);
        LeadStatus newStatus = parseStatus(request.getStatus());

        LeadStatus previousStatus = lead.getStatus();
        lead.setStatus(newStatus);
        Instant now = Instant.now();
        if (newStatus == LeadStatus.CONTACTED || newStatus == LeadStatus.INTERESTED
            || newStatus == LeadStatus.ADMISSION_INTERESTED || newStatus == LeadStatus.VISIT_PLANNED) {
            lead.setLastContactedAt(now);
        }
        // Stamp milestone timestamps on first transition (never overwrite once set)
        if (newStatus == LeadStatus.VISIT_PLANNED && lead.getVisitPlannedAt() == null) {
            lead.setVisitPlannedAt(now);
        }
        if (newStatus == LeadStatus.VISIT_DONE && lead.getVisitDoneAt() == null) {
            lead.setVisitDoneAt(now);
        }
        if (newStatus == LeadStatus.BOOKING_CONFIRMED && lead.getBookingConfirmedAt() == null) {
            lead.setBookingConfirmedAt(now);
        }
        if (newStatus == LeadStatus.ADMISSION_DONE && lead.getAdmissionDoneAt() == null) {
            lead.setAdmissionDoneAt(now);
        }

        Lead saved = leadDao.save(lead);

        // Record every status change in the activity timeline
        activityService.record(id, instituteId,
            "STATUS_CHANGED",
            "Status changed from " + previousStatus.name().replace("_", " ")
                + " → " + newStatus.name().replace("_", " "),
            principal.getId());

        log.info("Lead {} status changed {} → {} by actor {}", id, previousStatus, newStatus, principal.getId());
        return leadMapper.toResponse(saved);
    }

    // ── Assign ──────────────────────────────────────────────────────────────

    @Transactional
    public LeadResponse assign(Long id, Long callerId, Long instituteId, Long actorId) {
        Lead lead = findOrThrow(id, instituteId);
        Long previousCaller = lead.getAssignedToId();
        leadDao.assign(id, callerId, actorId);

        // Record activity
        if (previousCaller == null) {
            activityService.record(id, instituteId, "ASSIGNED",
                "Lead assigned to caller ID " + callerId, actorId);
        } else if (!previousCaller.equals(callerId)) {
            activityService.record(id, instituteId, "REASSIGNED",
                "Lead reassigned from caller ID " + previousCaller + " to caller ID " + callerId, actorId);
        }

        lead.setAssignedToId(callerId);
        lead.setStatus(LeadStatus.ASSIGNED);
        log.info("Lead {} assigned to caller {} by {}", id, callerId, actorId);
        return leadMapper.toResponse(lead);
    }

    // ── Unassign ─────────────────────────────────────────────────────────────

    @Transactional
    public LeadResponse unassign(Long id, Long instituteId, Long actorId) {
        Lead lead = findOrThrow(id, instituteId);
        Long previousCaller = lead.getAssignedToId();
        leadDao.unassign(id, actorId);
        activityService.record(id, instituteId, "UNASSIGNED",
            "Lead unassigned from caller ID " + previousCaller, actorId);
        lead.setAssignedToId(null);
        lead.setStatus(LeadStatus.NEW_LEAD);
        log.info("Lead {} unassigned by {}", id, actorId);
        return leadMapper.toResponse(lead);
    }

    // ── Bulk Assign ──────────────────────────────────────────────────────────

    @Transactional
    public BulkAssignResult bulkAssign(BulkAssignRequest request, Long instituteId, Long actorId) {
        List<Long> ids = request.getLeadIds().stream().distinct().toList();
        List<Lead> found = leadDao.findByIds(ids, instituteId);

        // Index found leads for O(1) lookup
        var foundMap = found.stream().collect(java.util.stream.Collectors.toMap(Lead::getId, l -> l));

        int assigned = 0, reassigned = 0, skipped = 0, notFound = 0;
        List<String> errors = new ArrayList<>();

        for (Long leadId : ids) {
            Lead lead = foundMap.get(leadId);
            if (lead == null) { notFound++; errors.add("Lead ID " + leadId + " not found"); continue; }

            Long prev = lead.getAssignedToId();
            if (Objects.equals(prev, request.getCallerId())) { skipped++; continue; }

            try {
                leadDao.assign(leadId, request.getCallerId(), actorId);
                if (prev == null) {
                    activityService.record(leadId, instituteId, "ASSIGNED",
                        "Lead assigned to caller ID " + request.getCallerId(), actorId);
                    assigned++;
                } else {
                    activityService.record(leadId, instituteId, "REASSIGNED",
                        "Lead reassigned from caller ID " + prev + " to caller ID " + request.getCallerId(), actorId);
                    reassigned++;
                }
            } catch (Exception e) {
                errors.add("Lead ID " + leadId + ": " + e.getMessage());
            }
        }

        log.info("Bulk assign: assigned={}, reassigned={}, skipped={}, notFound={}", assigned, reassigned, skipped, notFound);
        return BulkAssignResult.builder()
            .requested(ids.size())
            .assigned(assigned)
            .reassigned(reassigned)
            .skipped(skipped)
            .notFound(notFound)
            .errors(errors)
            .build();
    }

    // ── Activity timeline ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LeadActivityResponse> listActivities(Long id, Long instituteId) {
        findOrThrow(id, instituteId); // ensures lead exists and belongs to institute
        return activityService.listForLead(id, instituteId);
    }

    // ── Convert (kept for backward compat) ──────────────────────────────────

    @Transactional
    public LeadResponse convert(Long id, Long instituteId) {
        Lead lead = findOrThrow(id, instituteId);
        if (lead.getStatus() == LeadStatus.BOOKING_CONFIRMED) {
            throw new BusinessException("Lead is already converted", "LEAD_ALREADY_CONVERTED", HttpStatus.CONFLICT);
        }
        lead.setStatus(LeadStatus.BOOKING_CONFIRMED);
        lead.setConvertedAt(Instant.now());
        Lead saved = leadDao.save(lead);
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

    /**
     * Same-number routing: if this phone number was active within 90 days,
     * auto-assign the new lead to the same caller to preserve relationship continuity.
     */
    private void applyReturnRouting(Lead lead, Long instituteId) {
        leadDao.findLastCallerByPhone(lead.getPhone(), instituteId, 90).ifPresent(previousCallerId -> {
            lead.setAssignedToId(previousCallerId);
            lead.setAssignedAt(Instant.now());
            lead.setStatus(LeadStatus.ASSIGNED);
            lead.setPreviousCallerId(previousCallerId);
            log.info("Same-number routing: phone {} assigned back to caller {} (within 90 days)",
                lead.getPhone(), previousCallerId);
        });
    }

    private Lead findOrThrow(Long id, Long instituteId) {
        return leadDao.findByIdAndInstituteId(id, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Lead", id));
    }

    private void enforceOwnership(Lead lead, UserPrincipal principal) {
        // Admins (LEAD_ASSIGN or LEAD_DELETE) bypass ownership check
        boolean isAdmin = principal.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("LEAD_ASSIGN") || a.getAuthority().equals("LEAD_DELETE"));
        if (isAdmin) return;

        // Callers and counsellors — must be the current active owner (assigned_to_id)
        // For callers: assigned_to_id = callerId (pre-handoff)
        // For counsellors: assigned_to_id = counsellorId (post-handoff via V30 handoff endpoint)
        if (!Objects.equals(lead.getAssignedToId(), principal.getId())) {
            throw new BusinessException("You can only update leads assigned to you", "ACCESS_DENIED", HttpStatus.FORBIDDEN);
        }
    }

    static LeadStatus parseStatus(String value) {
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

    private static CurrentWork parseCurrentWork(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return CurrentWork.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid currentWork '" + value + "'", "INVALID_CURRENT_WORK", HttpStatus.BAD_REQUEST);
        }
    }

    private static InterestedFor parseInterestedFor(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return InterestedFor.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid interestedFor '" + value + "'", "INVALID_INTERESTED_FOR", HttpStatus.BAD_REQUEST);
        }
    }

    private static Workbook openWorkbook(MultipartFile file) throws IOException {
        String name = file.getOriginalFilename();
        if (name != null && name.endsWith(".csv")) {
            throw new BusinessException("CSV not supported. Please upload .xlsx or .xls", "UNSUPPORTED_FORMAT", HttpStatus.BAD_REQUEST);
        }
        return new XSSFWorkbook(file.getInputStream());
    }

    private static String extractPhone(Row row) {
        // Try column 0 (date) then column 1 (mobile) — or look for a 10-digit number
        for (int col = 0; col <= 2; col++) {
            Cell cell = row.getCell(col);
            if (cell == null) continue;
            String val = getCellString(cell).replaceAll("[^0-9]", "");
            if (val.length() == 10 && val.matches("[6-9]\\d{9}")) return val;
            if (val.length() == 12 && val.startsWith("91")) {
                String trimmed = val.substring(2);
                if (trimmed.matches("[6-9]\\d{9}")) return trimmed;
            }
        }
        return null;
    }

    private static String getCellString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case STRING  -> cell.getStringCellValue().trim();
            default      -> "";
        };
    }
}
