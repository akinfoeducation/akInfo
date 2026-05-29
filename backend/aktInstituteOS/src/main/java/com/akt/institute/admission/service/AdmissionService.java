package com.akt.institute.admission.service;

import com.akt.institute.admission.domain.Admission;
import com.akt.institute.admission.domain.AdmissionStatus;
import com.akt.institute.admission.dto.*;
import com.akt.institute.admission.mapper.AdmissionMapper;
import com.akt.institute.admission.repository.AdmissionDao;
import com.akt.institute.lead.domain.LeadStatus;
import com.akt.institute.lead.repository.LeadDao;
import com.akt.institute.notification.event.AdmissionNotificationEvent;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.dto.PageMeta;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.course.repository.CourseDao;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import com.akt.institute.shared.util.SequenceGenerator;
import com.akt.institute.student.dto.CreateStudentRequest;
import com.akt.institute.student.service.StudentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
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
public class AdmissionService {

    private final AdmissionDao admissionDao;
    private final LeadDao leadDao;
    private final CourseDao courseDao;
    private final AdmissionMapper admissionMapper;
    private final SequenceGenerator sequenceGenerator;
    private final StudentService studentService;
    private final ApplicationEventPublisher eventPublisher;

    // ── Create ──────────────────────────────────────────────────────────────

    @Transactional
    public AdmissionResponse create(CreateAdmissionRequest request, Long instituteId) {
        var lead = leadDao.findByIdAndInstituteId(request.getLeadId(), instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Lead", request.getLeadId()));

        if (lead.getStatus() != LeadStatus.CONVERTED) {
            throw new BusinessException(
                "Lead must be converted before creating an admission. Current status: " + lead.getStatus(),
                "LEAD_NOT_CONVERTED", HttpStatus.BAD_REQUEST);
        }

        if (admissionDao.existsByLeadIdAndInstituteId(request.getLeadId(), instituteId)) {
            throw new BusinessException(
                "An admission already exists for this lead",
                "ADMISSION_ALREADY_EXISTS", HttpStatus.CONFLICT);
        }

        // Optional batch validation during creation
        if (request.getBatchId() != null) {
            var batch = courseDao.findBatchByIdAndInstituteId(request.getBatchId(), instituteId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch", request.getBatchId()));
            if (batch.getMaxCapacity() != null && batch.getEnrolledCount() >= batch.getMaxCapacity()) {
                throw new BusinessException(
                    "Batch is full. Capacity: " + batch.getMaxCapacity(),
                    "BATCH_FULL", HttpStatus.BAD_REQUEST);
            }
            request.setBatchName(batch.getName());
        }

        Admission admission = admissionMapper.toEntity(request);
        admission.setUuid(UUID.randomUUID().toString());
        admission.setAdmissionNumber(sequenceGenerator.next(instituteId, SequenceGenerator.ADMISSION));
        admission.setInstituteId(instituteId);
        admission.setStatus(AdmissionStatus.PENDING);

        Admission saved = admissionDao.save(admission);

        // Record initial batch assignment history if batch was provided
        if (request.getBatchId() != null) {
            courseDao.recordBatchAssignment(instituteId, saved.getId(), null, request.getBatchId(),
                "ASSIGNED", "Assigned at admission creation",
                com.akt.institute.shared.util.AuditUtil.getCurrentUserId());
        }

        log.info("Admission created: id={}, number={}, leadId={}", saved.getId(), saved.getAdmissionNumber(), saved.getLeadId());

        // Publish notification event (async, non-blocking)
        try {
            eventPublisher.publishEvent(new AdmissionNotificationEvent(
                this, saved.getInstituteId(), saved.getId(),
                saved.getFullName(), saved.getPhone(), saved.getEmail(),
                saved.getCourseName(), saved.getAdmissionNumber(),
                saved.getEnrollmentDate() != null ? saved.getEnrollmentDate().toString() : "",
                saved.getFeesAgreed()
            ));
        } catch (Exception ex) {
            log.warn("Failed to publish admission notification event: {}", ex.getMessage());
        }

        return admissionMapper.toResponse(saved);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AdmissionResponse getById(Long id, Long instituteId) {
        return admissionMapper.toResponse(findOrThrow(id, instituteId));
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<AdmissionSummaryResponse>> list(
        Long instituteId, String status, String q,
        int page, int size, String sortField, String sortDir
    ) {
        List<Admission> admissions = admissionDao.findWithFilters(instituteId, status, q, page, size, sortField, sortDir);
        long total = admissionDao.countWithFilters(instituteId, status, q);
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / size);

        return ApiResponse.paged(
            admissionMapper.toSummaryList(admissions),
            PageMeta.builder()
                .page(page).size(size).total(total).totalPages(totalPages)
                .hasNext((long) (page + 1) * size < total)
                .hasPrevious(page > 0)
                .build()
        );
    }

    // ── Update ──────────────────────────────────────────────────────────────

    @Transactional
    public AdmissionResponse update(Long id, UpdateAdmissionRequest request, Long instituteId) {
        Admission admission = findOrThrow(id, instituteId);
        admissionMapper.updateEntity(admission, request);
        Admission saved = admissionDao.save(admission);
        return admissionMapper.toResponse(saved);
    }

    // ── Status ──────────────────────────────────────────────────────────────

    @Transactional
    public AdmissionResponse updateStatus(Long id, UpdateAdmissionStatusRequest request, Long instituteId) {
        Admission admission = findOrThrow(id, instituteId);
        AdmissionStatus newStatus = parseStatus(request.getStatus());

        if (admission.getStatus() == AdmissionStatus.CANCELLED) {
            throw new BusinessException("Cannot change status of a cancelled admission",
                "ADMISSION_IS_CANCELLED", HttpStatus.BAD_REQUEST);
        }
        if (admission.getStatus() == AdmissionStatus.COMPLETED) {
            throw new BusinessException("Cannot change status of a completed admission",
                "ADMISSION_IS_COMPLETED", HttpStatus.BAD_REQUEST);
        }

        admission.setStatus(newStatus);
        Admission saved = admissionDao.save(admission);
        log.info("Admission {} status changed to {}", id, newStatus);
        return admissionMapper.toResponse(saved);
    }

    // ── Enroll (create full student record from admission) ──────────────────

    @Transactional
    public AdmissionResponse enroll(Long id, CreateStudentRequest request, Long instituteId) {
        Admission admission = findOrThrow(id, instituteId);

        if (admission.getStatus() == AdmissionStatus.CANCELLED) {
            throw new BusinessException(
                "Cannot create a student record for a cancelled admission",
                "ADMISSION_IS_CANCELLED", HttpStatus.BAD_REQUEST);
        }
        if (admission.getStudentId() != null) {
            throw new BusinessException(
                "A student record already exists for this admission",
                "STUDENT_ALREADY_EXISTS", HttpStatus.CONFLICT);
        }

        // Always use leadId from the admission — never trust the request payload
        request.setLeadId(admission.getLeadId());

        var student = studentService.create(request, instituteId);
        admission.setStudentId(student.getId());
        Admission saved = admissionDao.save(admission);

        log.info("Student {} enrolled from admission {}", student.getId(), id);
        return admissionMapper.toResponse(saved);
    }

    // ── Batch assignment ────────────────────────────────────────────────────

    @Transactional
    public AdmissionResponse assignBatch(Long id, Long batchId, Long instituteId) {
        Admission admission = findOrThrow(id, instituteId);
        Long fromBatchId = admission.getBatchId();

        if (batchId == null) {
            admission.setBatchId(null);
        } else {
            var batch = courseDao.findBatchByIdAndInstituteId(batchId, instituteId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch", batchId));
            if (batch.getMaxCapacity() != null && batch.getEnrolledCount() >= batch.getMaxCapacity()) {
                throw new BusinessException(
                    "Batch is full. Capacity: " + batch.getMaxCapacity() + ", Enrolled: " + batch.getEnrolledCount(),
                    "BATCH_FULL", HttpStatus.BAD_REQUEST);
            }
            admission.setBatchId(batchId);
            admission.setBatchName(batch.getName());
        }

        Admission saved = admissionDao.save(admission);

        String action = batchId == null ? "REMOVED" : (fromBatchId != null ? "TRANSFERRED" : "ASSIGNED");
        courseDao.recordBatchAssignment(instituteId, id, fromBatchId, batchId, action, null,
            com.akt.institute.shared.util.AuditUtil.getCurrentUserId());

        log.info("Batch assignment updated: admissionId={}, batchId={}", id, batchId);
        return admissionMapper.toResponse(saved);
    }

    // ── Delete ──────────────────────────────────────────────────────────────

    @Transactional
    public void delete(Long id, Long instituteId) {
        Admission admission = findOrThrow(id, instituteId);
        admission.setDeletedAt(Instant.now());
        admissionDao.save(admission);
        log.info("Admission soft-deleted: id={}", id);
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private Admission findOrThrow(Long id, Long instituteId) {
        return admissionDao.findByIdAndInstituteId(id, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Admission", id));
    }

    private static AdmissionStatus parseStatus(String value) {
        try {
            return AdmissionStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(
                "Invalid status '" + value + "'. Valid values: " + Arrays.toString(AdmissionStatus.values()),
                "INVALID_ADMISSION_STATUS", HttpStatus.BAD_REQUEST);
        }
    }
}
