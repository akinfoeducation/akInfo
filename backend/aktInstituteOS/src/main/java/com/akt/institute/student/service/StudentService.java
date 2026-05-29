package com.akt.institute.student.service;

import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.dto.PageMeta;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.DuplicateResourceException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import com.akt.institute.shared.storage.FileStorageService;
import com.akt.institute.shared.util.SequenceGenerator;
import com.akt.institute.student.domain.Student;
import com.akt.institute.student.domain.StudentDocument;
import com.akt.institute.student.domain.StudentStatus;
import com.akt.institute.student.dto.*;
import com.akt.institute.student.event.StudentIndexEvent;
import com.akt.institute.student.mapper.StudentMapper;
import com.akt.institute.student.repository.StudentDao;
import com.akt.institute.student.repository.StudentDocumentDao;
import com.akt.institute.student.search.StudentSearchSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentService {

    private final StudentDao studentDao;
    private final StudentDocumentDao documentDao;
    private final StudentMapper studentMapper;
    private final SequenceGenerator sequenceGenerator;
    private final FileStorageService fileStorageService;
    private final ApplicationEventPublisher eventPublisher;
    private final StudentSearchSyncService searchSyncService;

    // ── Create ──────────────────────────────────────────────────────────────

    @Transactional
    public StudentResponse create(CreateStudentRequest request, Long instituteId) {
        checkPhoneDuplicate(request.getPhone(), instituteId, null);
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            checkEmailDuplicate(request.getEmail(), instituteId, null);
        }

        Student student = studentMapper.toEntity(request);
        student.setUuid(UUID.randomUUID().toString());
        student.setInstituteId(instituteId);
        student.setStudentNumber(sequenceGenerator.next(instituteId, SequenceGenerator.STUDENT));
        student.setStatus(StudentStatus.ACTIVE);

        Student saved = studentDao.save(student);
        log.info("Student created: studentNumber={}, id={}", saved.getStudentNumber(), saved.getId());

        eventPublisher.publishEvent(new StudentIndexEvent(saved.getId(), StudentIndexEvent.Operation.UPSERT));

        return studentMapper.toResponse(saved);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public StudentResponse getById(Long id, Long instituteId) {
        Student student = findOrThrow(id, instituteId);
        student.setDocuments(documentDao.findAllByStudentId(id));
        return studentMapper.toResponse(student);
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<StudentSummaryResponse>> list(
        Long instituteId, String status, String q, int page, int size, String sortField, String sortDir
    ) {
        List<Student> students = studentDao.findWithFilters(instituteId, status, q, page, size, sortField, sortDir);
        long total = studentDao.countWithFilters(instituteId, status, q);
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / size);

        return ApiResponse.paged(
            studentMapper.toSummaryList(students),
            PageMeta.builder()
                .page(page).size(size).total(total).totalPages(totalPages)
                .hasNext((long) (page + 1) * size < total)
                .hasPrevious(page > 0)
                .build()
        );
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<StudentSummaryResponse>> search(
        String query, Long instituteId, String status, int page, int size
    ) {
        var searchResult = searchSyncService.search(query, instituteId, status, page, size);

        if (searchResult == null || searchResult.getHits() == null) {
            log.warn("Meilisearch unavailable, falling back to DB search: q={}", query);
            return list(instituteId, status, query, page, size, "createdAt", "desc");
        }

        List<Long> ids = searchResult.getHits().stream()
            .map(hit -> ((Number) hit.get("id")).longValue())
            .toList();

        if (ids.isEmpty()) {
            return ApiResponse.paged(List.of(), PageMeta.builder()
                .page(page).size(size).total(0).totalPages(0)
                .hasNext(false).hasPrevious(false).build());
        }

        var students = studentDao.findAllByIds(ids);
        var ordered = ids.stream()
            .flatMap(id -> students.stream().filter(s -> s.getId().equals(id)))
            .toList();

        Integer estimated = searchResult.getEstimatedTotalHits();
        long total = estimated != null ? estimated : ordered.size();
        int totalPages = (int) Math.ceil((double) total / size);

        return ApiResponse.paged(
            studentMapper.toSummaryList(ordered),
            PageMeta.builder()
                .page(page).size(size).total(total).totalPages(totalPages)
                .hasNext((long) (page + 1) * size < total)
                .hasPrevious(page > 0)
                .build()
        );
    }

    // ── Update ──────────────────────────────────────────────────────────────

    @Transactional
    public StudentResponse update(Long id, UpdateStudentRequest request, Long instituteId) {
        Student student = findOrThrow(id, instituteId);

        if (request.getPhone() != null) {
            checkPhoneDuplicate(request.getPhone(), instituteId, id);
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            checkEmailDuplicate(request.getEmail(), instituteId, id);
        }

        studentMapper.updateEntity(student, request);
        Student saved = studentDao.save(student);

        eventPublisher.publishEvent(new StudentIndexEvent(saved.getId(), StudentIndexEvent.Operation.UPSERT));

        return studentMapper.toResponse(saved);
    }

    @Transactional
    public StudentResponse updateStatus(Long id, UpdateStudentStatusRequest request, Long instituteId) {
        Student student = findOrThrow(id, instituteId);
        StudentStatus newStatus = StudentStatus.valueOf(request.getStatus());

        student.setStatus(newStatus);
        Student saved = studentDao.save(student);

        eventPublisher.publishEvent(new StudentIndexEvent(saved.getId(), StudentIndexEvent.Operation.UPSERT));
        log.info("Student {} status changed to {}", id, newStatus);

        return studentMapper.toResponse(saved);
    }

    @Transactional
    public StudentResponse uploadPhoto(Long id, MultipartFile file, Long instituteId) {
        Student student = findOrThrow(id, instituteId);

        if (student.getPhotoUrl() != null) {
            fileStorageService.delete(student.getPhotoUrl());
        }

        var stored = fileStorageService.store(file, "students/photos");
        student.setPhotoUrl(stored.url());
        Student saved = studentDao.save(student);

        eventPublisher.publishEvent(new StudentIndexEvent(saved.getId(), StudentIndexEvent.Operation.UPSERT));
        return studentMapper.toResponse(saved);
    }

    // ── Delete ──────────────────────────────────────────────────────────────

    @Transactional
    public void delete(Long id, Long instituteId) {
        Student student = findOrThrow(id, instituteId);
        student.setDeletedAt(Instant.now());
        studentDao.save(student);

        eventPublisher.publishEvent(new StudentIndexEvent(id, StudentIndexEvent.Operation.DELETE));
        log.info("Student soft-deleted: id={}, studentNumber={}", id, student.getStudentNumber());
    }

    // ── Documents ───────────────────────────────────────────────────────────

    @Transactional
    public StudentResponse.DocumentInfo uploadDocument(
        Long studentId, MultipartFile file, String documentType, Long instituteId
    ) {
        findOrThrow(studentId, instituteId);
        validateDocumentType(documentType);

        var stored = fileStorageService.store(file, "students/documents");

        var doc = StudentDocument.builder()
            .studentId(studentId)
            .documentType(documentType)
            .fileName(stored.originalName())
            .fileUrl(stored.url())
            .fileSizeBytes(stored.sizeBytes())
            .mimeType(stored.mimeType())
            .build();

        StudentDocument saved = documentDao.save(doc);
        return studentMapper.toDocumentInfo(saved);
    }

    @Transactional(readOnly = true)
    public List<StudentResponse.DocumentInfo> listDocuments(Long studentId, Long instituteId) {
        findOrThrow(studentId, instituteId);
        return documentDao.findAllByStudentId(studentId)
            .stream()
            .map(studentMapper::toDocumentInfo)
            .toList();
    }

    @Transactional
    public void deleteDocument(Long studentId, Long documentId, Long instituteId) {
        findOrThrow(studentId, instituteId);
        var doc = documentDao.findByIdAndStudentId(documentId, studentId)
            .orElseThrow(() -> new ResourceNotFoundException("Document", documentId));

        fileStorageService.delete(doc.getFileUrl());
        doc.setDeletedAt(Instant.now());
        documentDao.save(doc);
    }

    // ── Duplicate check ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public DuplicateCheckResponse checkDuplicate(String phone, String email, Long instituteId) {
        boolean phoneExists = phone != null && studentDao.existsByPhoneAndInstituteId(phone, instituteId);
        boolean emailExists = email != null && !email.isBlank()
            && studentDao.existsByEmailAndInstituteId(email, instituteId);
        return DuplicateCheckResponse.builder()
            .phoneExists(phoneExists)
            .emailExists(emailExists)
            .isDuplicate(phoneExists || emailExists)
            .build();
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private Student findOrThrow(Long id, Long instituteId) {
        return studentDao.findByIdAndInstituteId(id, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Student", id));
    }

    private void checkPhoneDuplicate(String phone, Long instituteId, Long excludeId) {
        boolean exists = excludeId == null
            ? studentDao.existsByPhoneAndInstituteId(phone, instituteId)
            : studentDao.existsByPhoneAndInstituteIdAndIdNot(phone, instituteId, excludeId);
        if (exists) throw new DuplicateResourceException("Student", "phone", phone);
    }

    private void checkEmailDuplicate(String email, Long instituteId, Long excludeId) {
        boolean exists = excludeId == null
            ? studentDao.existsByEmailAndInstituteId(email, instituteId)
            : studentDao.existsByEmailAndInstituteIdAndIdNot(email, instituteId, excludeId);
        if (exists) throw new DuplicateResourceException("Student", "email", email);
    }

    private void validateDocumentType(String type) {
        var allowed = Set.of("PHOTO", "AADHAAR", "MARKSHEET", "CERTIFICATE", "OTHER");
        if (!allowed.contains(type)) {
            throw new BusinessException(
                "Invalid document type. Allowed: " + allowed, "INVALID_DOCUMENT_TYPE", HttpStatus.BAD_REQUEST);
        }
    }
}
