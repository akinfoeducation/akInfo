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
import org.springframework.dao.DataIntegrityViolationException;
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
    private final com.akt.institute.auth.repository.UserDao userDao;
    private final com.akt.institute.auth.service.UserAccessValidator userAccessValidator;

    /** Role code a lead can be assigned to (lead owner before handoff). */
    private static final String CALLER_ROLE = "CALLER";

    /**
     * Statuses that lock a lead to its current caller. A lead in one of these
     * states must not be reassigned to a different caller — the relationship is
     * "warm" and belongs to whoever is working it (admin business rule). Other
     * statuses (incl. NOT_CONNECTED, which routes through the retry pool) stay
     * freely reassignable.
     */
    private static final Set<LeadStatus> OWNERSHIP_LOCKED =
        Set.of(LeadStatus.CALLBACK, LeadStatus.INTERESTED);

    // ── Create ──────────────────────────────────────────────────────────────

    @Transactional
    public LeadResponse create(CreateLeadRequest request, Long instituteId) {
        // Block if an ACTIVE lead already exists whose primary OR alternate number
        // collides with either number on this request. A returning number whose
        // prior lead(s) are all dead/closed falls through to same-number routing
        // below (Scenario C9), which re-assigns it to the previous caller.
        if (leadDao.hasActiveLeadByAnyPhone(
                List.of(request.getPhone(), nullToEmpty(request.getWhatsappNumber())), instituteId)) {
            throw new DuplicateResourceException("Lead", "phone", request.getPhone());
        }

        // C1: if the request hand-picks an owner, it must be a real CALLER in this institute —
        // otherwise the lead would be created owned by an arbitrary / cross-tenant user id.
        if (request.getAssignedToId() != null) {
            userAccessValidator.requireActiveUserWithRole(request.getAssignedToId(), instituteId, CALLER_ROLE);
        }

        Lead lead = leadMapper.toEntity(request);
        lead.setUuid(UUID.randomUUID().toString());
        lead.setInstituteId(instituteId);
        lead.setStatus(LeadStatus.NEW_LEAD);
        // Name optional at intake — fall back to the phone number (same as bulk import),
        // since first_name is NOT NULL and the real name is captured during qualification.
        if (lead.getFirstName() == null || lead.getFirstName().isBlank()) {
            lead.setFirstName(request.getPhone());
        }
        lead.setSource(parseSource(request.getSource()));
        lead.setCurrentWork(parseCurrentWork(request.getCurrentWork()));
        lead.setInterestedFor(parseInterestedFor(request.getInterestedFor()));
        lead.setNextFollowUpAt(DateTimeUtil.parseFlexible(request.getNextFollowUpAt()));

        // Same-number routing: if this number was seen within 90 days, route to the same caller
        applyReturnRouting(lead, instituteId);

        Lead saved;
        try {
            saved = leadDao.save(lead);
        } catch (DataIntegrityViolationException e) {
            // The partial unique index (uq_leads_active_phone) is the final authority:
            // a concurrent create that slipped past the check above lands here.
            throw new DuplicateResourceException("Lead", "phone", request.getPhone());
        }
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
                    // Matches against both primary and alternate (whatsapp) numbers.
                    if (leadDao.hasActiveLeadByAnyPhone(List.of(phone), instituteId)) { duplicates++; continue; }

                    Lead lead = new Lead();
                    lead.setUuid(UUID.randomUUID().toString());
                    lead.setInstituteId(instituteId);
                    lead.setPhone(phone);
                    lead.setFirstName(phone); // temporary — caller fills in the real name after calling
                    lead.setStatus(LeadStatus.NEW_LEAD);
                    lead.setSource(LeadSource.IMPORTED);  // bulk import origin — distinct from genuine walk-ins
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
    public LeadResponse getById(Long id, Long instituteId, UserPrincipal principal) {
        Lead lead = findOrThrow(id, instituteId);
        enforceReadAccess(lead, principal);
        LeadResponse response = leadMapper.toResponse(lead);
        admissionDao.findAdmissionIdByLeadId(id, instituteId)
            .ifPresent(response::setAdmissionId);
        // Resolve owner names for the detail view (so the UI shows names, not ids).
        response.setCallerName(userName(lead.getCallerId()));
        response.setCounsellorName(userName(lead.getCounsellorId()));
        return response;
    }

    /** Resolves a user id to a display name, or null. */
    private String userName(Long userId) {
        if (userId == null) return null;
        return userDao.findById(userId).map(com.akt.institute.auth.domain.User::getFullName).orElse(null);
    }

    /**
     * Real-time duplicate lookup for the lead form (Requirement 6). Returns the
     * existing active lead's status + owner if the number is already in the system
     * (matched against primary OR alternate), else a not-found result. Intentionally
     * cross-caller — surfacing "this number already belongs to caller X" is the whole
     * point of the check — but exposes only summary fields, not the full lead.
     */
    @Transactional(readOnly = true)
    public LeadLookupResponse lookupByPhone(String phone, Long instituteId) {
        if (phone == null || phone.isBlank()) return LeadLookupResponse.notFound();
        return leadDao.lookupActiveByAnyPhone(List.of(phone), instituteId, null)
            .orElseGet(LeadLookupResponse::notFound);
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

        // Duplicate protection on the caller's main entry point (admin seeds the
        // number, the caller fills in the rest during the call). Unlike create/import
        // — which hard-block — an update must NOT interrupt the call: a primary or
        // alternate number that already belongs to another active lead is dropped
        // (not persisted), every other field still saves, and the conflict is
        // reported so the UI can show the duplicate popup (Requirement 6).
        List<LeadDuplicateConflict> conflicts = new ArrayList<>();
        if (isChangedNumber(request.getPhone(), lead.getPhone())) {
            leadDao.lookupActiveByAnyPhone(List.of(request.getPhone()), instituteId, id).ifPresent(other -> {
                conflicts.add(toConflict(request.getPhone(), "phone", other));
                request.setPhone(null);              // mapper IGNOREs nulls → keeps existing number
            });
        }
        if (isChangedNumber(request.getWhatsappNumber(), lead.getWhatsappNumber())) {
            leadDao.lookupActiveByAnyPhone(List.of(request.getWhatsappNumber()), instituteId, id).ifPresent(other -> {
                conflicts.add(toConflict(request.getWhatsappNumber(), "whatsappNumber", other));
                request.setWhatsappNumber(null);
            });
        }

        if (request.getSource() != null) lead.setSource(parseSource(request.getSource()));
        if (request.getCurrentWork() != null) lead.setCurrentWork(parseCurrentWork(request.getCurrentWork()));
        if (request.getInterestedFor() != null) lead.setInterestedFor(parseInterestedFor(request.getInterestedFor()));

        leadMapper.updateEntity(lead, request);
        if (request.getNextFollowUpAt() != null) {
            lead.setNextFollowUpAt(DateTimeUtil.parseFlexible(request.getNextFollowUpAt()));
        }
        Lead saved = leadDao.save(lead);
        LeadResponse response = leadMapper.toResponse(saved);
        if (!conflicts.isEmpty()) {
            response.setDuplicateConflicts(conflicts);
            log.info("Lead {} updated with {} duplicate number(s) dropped", id, conflicts.size());
        }
        return response;
    }

    // ── Assign ──────────────────────────────────────────────────────────────

    @Transactional
    public LeadResponse assign(Long id, Long callerId, Long instituteId, Long actorId) {
        // C1: never trust the client-supplied caller id — it must be an active CALLER in this institute.
        userAccessValidator.requireActiveUserWithRole(callerId, instituteId, CALLER_ROLE);

        Lead lead = findOrThrow(id, instituteId);
        Long previousCaller = lead.getAssignedToId();

        // Ownership lock: a CALLBACK/INTERESTED lead stays with its current caller —
        // it cannot be moved to a *different* caller. Initial assignment (no prior
        // caller) and re-assigning to the same caller are still allowed.
        if (isOwnershipLockedMove(lead, previousCaller, callerId)) {
            throw ownershipLocked(id, lead.getStatus());
        }

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
        // C1: validate the target caller once for the whole batch.
        userAccessValidator.requireActiveUserWithRole(request.getCallerId(), instituteId, CALLER_ROLE);

        List<Long> ids = request.getLeadIds().stream().distinct().toList();
        List<Lead> found = leadDao.findByIds(ids, instituteId);

        // Index found leads for O(1) lookup
        var foundMap = found.stream().collect(java.util.stream.Collectors.toMap(Lead::getId, l -> l));

        int assigned = 0, reassigned = 0, skipped = 0, locked = 0, notFound = 0;
        List<String> errors = new ArrayList<>();

        for (Long leadId : ids) {
            Lead lead = foundMap.get(leadId);
            if (lead == null) { notFound++; errors.add("Lead ID " + leadId + " not found"); continue; }

            Long prev = lead.getAssignedToId();
            if (Objects.equals(prev, request.getCallerId())) { skipped++; continue; }

            // Ownership lock — a CALLBACK/INTERESTED lead cannot be moved to another caller.
            if (isOwnershipLockedMove(lead, prev, request.getCallerId())) {
                locked++;
                errors.add("Lead ID " + leadId + " is " + lead.getStatus()
                    + " and locked to its current caller — not reassigned");
                continue;
            }

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

        log.info("Bulk assign: assigned={}, reassigned={}, skipped={}, locked={}, notFound={}",
            assigned, reassigned, skipped, locked, notFound);
        return BulkAssignResult.builder()
            .requested(ids.size())
            .assigned(assigned)
            .reassigned(reassigned)
            .skipped(skipped)
            .locked(locked)
            .notFound(notFound)
            .errors(errors)
            .build();
    }

    // ── Activity timeline ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LeadActivityResponse> listActivities(Long id, Long instituteId, UserPrincipal principal) {
        Lead lead = findOrThrow(id, instituteId); // ensures lead exists and belongs to institute
        enforceReadAccess(lead, principal);
        return activityService.listForLead(id, instituteId);
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
        if (isPrivileged(principal)) return;

        // Callers and counsellors — must be the current active owner (assigned_to_id)
        // For callers: assigned_to_id = callerId (pre-handoff)
        // For counsellors: assigned_to_id = counsellorId (post-handoff via V30 handoff endpoint)
        if (!Objects.equals(lead.getAssignedToId(), principal.getId())) {
            throw new BusinessException("You can only update leads assigned to you", "ACCESS_DENIED", HttpStatus.FORBIDDEN);
        }
    }

    /**
     * Read-access guard for single-lead reads. The leads list is already filtered
     * per caller, but a direct fetch by id must not let an unrelated caller read a
     * lead they have no relationship with. Admins see everything; otherwise the
     * actor must be the current owner, the attributed caller, or the counsellor.
     */
    private void enforceReadAccess(Lead lead, UserPrincipal principal) {
        if (isPrivileged(principal)) return;
        Long uid = principal.getId();
        boolean related = Objects.equals(lead.getAssignedToId(), uid)
            || Objects.equals(lead.getCallerId(), uid)
            || Objects.equals(lead.getCounsellorId(), uid);
        if (!related) {
            throw new BusinessException("You can only view leads assigned to you", "ACCESS_DENIED", HttpStatus.FORBIDDEN);
        }
    }

    /** Admin-level lead privileges that bypass per-lead ownership/read checks. */
    private boolean isPrivileged(UserPrincipal principal) {
        return principal.getAuthorities().stream().anyMatch(a -> {
            String auth = a.getAuthority();
            return auth.equals("LEAD_ASSIGN") || auth.equals("LEAD_DELETE") || auth.equals("LEAD_STATUS_OVERRIDE");
        });
    }

    /**
     * True if moving this lead from {@code previousCaller} to {@code newCaller} is
     * blocked by the ownership lock: the lead is in a locked status AND it already
     * has a (different) owner. Initial assignment and re-assigning to the same
     * caller are never locked.
     */
    private boolean isOwnershipLockedMove(Lead lead, Long previousCaller, Long newCaller) {
        return previousCaller != null
            && !Objects.equals(previousCaller, newCaller)
            && OWNERSHIP_LOCKED.contains(lead.getStatus());
    }

    private BusinessException ownershipLocked(Long leadId, LeadStatus status) {
        log.info("Reassignment of lead {} blocked — locked to current caller in status {}", leadId, status);
        return new BusinessException(
            "This lead is " + status + " and is locked to its current caller; it cannot be reassigned",
            "LEAD_OWNERSHIP_LOCKED", HttpStatus.CONFLICT);
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    /** True if the request supplied a number that actually differs from the stored one. */
    private static boolean isChangedNumber(String incoming, String current) {
        return incoming != null && !incoming.isBlank() && !incoming.equals(current);
    }

    private LeadDuplicateConflict toConflict(String number, String field, LeadLookupResponse other) {
        return LeadDuplicateConflict.builder()
            .number(number)
            .field(field)
            .conflictingLeadId(other.getLeadId())
            .conflictingLeadName(other.getName())
            .conflictingLeadStatus(other.getStatus())
            .assignedToId(other.getAssignedToId())
            .assignedToName(other.getAssignedToName())
            .build();
    }

    private static LeadSource parseSource(String value) {
        if (value == null || value.isBlank()) return LeadSource.UNKNOWN;
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
