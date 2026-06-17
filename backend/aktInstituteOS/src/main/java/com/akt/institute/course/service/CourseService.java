package com.akt.institute.course.service;

import com.akt.institute.course.domain.Batch;
import com.akt.institute.course.domain.BatchStatus;
import com.akt.institute.course.domain.Course;
import com.akt.institute.course.domain.CourseStatus;
import com.akt.institute.course.dto.*;
import com.akt.institute.shared.util.AuditUtil;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import com.akt.institute.course.mapper.CourseMapper;
import com.akt.institute.course.repository.CourseDao;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.DuplicateResourceException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseService {

    private final CourseDao courseDao;
    private final CourseMapper courseMapper;
    private final NamedParameterJdbcTemplate jdbc;

    // ── Courses ──────────────────────────────────────────────────────────────

    @Transactional
    public CourseResponse createCourse(CreateCourseRequest request, Long instituteId) {
        if (courseDao.existsByCodeAndInstituteId(request.getCode(), instituteId)) {
            throw new DuplicateResourceException("Course", "code", request.getCode());
        }
        Course course = courseMapper.toEntity(request);
        course.setUuid(UUID.randomUUID().toString());
        course.setInstituteId(instituteId);
        course.setStatus(CourseStatus.ACTIVE);

        Course saved = courseDao.saveCourse(course);
        saved.setBatches(List.of());
        log.info("Course created: id={}, code={}", saved.getId(), saved.getCode());
        return courseMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CourseSummaryResponse> listCourses(Long instituteId, String status) {
        List<Course> courses = courseDao.findCoursesByInstituteId(instituteId, status);
        courses.forEach(c -> {
            int count = courseDao.countBatchesByCourseId(c.getId());
            c.setBatches(count > 0 ? java.util.Collections.nCopies(count, null) : List.of());
        });
        return courseMapper.toSummaryList(courses);
    }

    @Transactional(readOnly = true)
    public List<CourseSummaryResponse> listCoursesByFaculty(Long instituteId, Long facultyUserId) {
        List<Course> courses = courseDao.findCoursesByFacultyUserId(instituteId, facultyUserId);
        courses.forEach(c -> {
            int count = courseDao.countBatchesByCourseId(c.getId());
            c.setBatches(count > 0 ? java.util.Collections.nCopies(count, null) : List.of());
        });
        return courseMapper.toSummaryList(courses);
    }

    @Transactional(readOnly = true)
    public CourseResponse getCourse(Long id, Long instituteId) {
        Course course = findCourseOrThrow(id, instituteId);
        course.setBatches(courseDao.findBatchesByCourseId(id, instituteId));
        return courseMapper.toResponse(course);
    }

    @Transactional
    public CourseResponse updateCourse(Long id, UpdateCourseRequest request, Long instituteId) {
        Course course = findCourseOrThrow(id, instituteId);
        if (request.getStatus() != null) {
            course.setStatus(parseCourseStatus(request.getStatus()));
        }
        courseMapper.updateCourseEntity(course, request);
        Course saved = courseDao.saveCourse(course);
        saved.setBatches(courseDao.findBatchesByCourseId(id, instituteId));
        return courseMapper.toResponse(saved);
    }

    @Transactional
    public void deleteCourse(Long id, Long instituteId) {
        findCourseOrThrow(id, instituteId);
        courseDao.deleteCourse(id);
        log.info("Course soft-deleted: id={}", id);
    }

    // ── Batches ──────────────────────────────────────────────────────────────

    @Transactional
    public BatchResponse createBatch(Long courseId, CreateBatchRequest request, Long instituteId) {
        findCourseOrThrow(courseId, instituteId);
        Batch batch = courseMapper.toBatchEntity(request);
        batch.setUuid(UUID.randomUUID().toString());
        batch.setInstituteId(instituteId);
        batch.setCourseId(courseId);
        batch.setStatus(BatchStatus.PLANNED);

        Batch saved = courseDao.saveBatch(batch);
        log.info("Batch created: id={}, courseId={}", saved.getId(), courseId);
        return courseMapper.toBatchResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<BatchResponse> listBatches(Long courseId, Long instituteId) {
        findCourseOrThrow(courseId, instituteId);
        return courseMapper.toBatchResponseList(courseDao.findBatchesByCourseId(courseId, instituteId));
    }

    @Transactional
    public BatchResponse updateBatch(Long courseId, Long batchId, UpdateBatchRequest request, Long instituteId) {
        findCourseOrThrow(courseId, instituteId);
        Batch batch = courseDao.findBatchByIdAndCourseId(batchId, courseId, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Batch", batchId));
        if (request.getStatus() != null) {
            batch.setStatus(parseBatchStatus(request.getStatus()));
        }
        courseMapper.updateBatchEntity(batch, request);
        Batch saved = courseDao.saveBatch(batch);
        return courseMapper.toBatchResponse(saved);
    }

    @Transactional
    public void deleteBatch(Long courseId, Long batchId, Long instituteId) {
        findCourseOrThrow(courseId, instituteId);
        Batch batch = courseDao.findBatchByIdAndCourseId(batchId, courseId, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Batch", batchId));
        batch.setDeletedAt(java.time.Instant.now());
        courseDao.saveBatch(batch);
        log.info("Batch soft-deleted: id={}", batchId);
    }

    // ── Standalone batch endpoints ───────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<BatchResponse> listAllBatches(Long instituteId, String status) {
        return courseMapper.toBatchResponseList(courseDao.findBatchesByInstituteId(instituteId, status));
    }

    @Transactional(readOnly = true)
    public List<BatchResponse> listBatchesByFaculty(Long instituteId, Long facultyUserId) {
        return courseMapper.toBatchResponseList(courseDao.findBatchesByFacultyUserId(instituteId, facultyUserId));
    }

    @Transactional(readOnly = true)
    public BatchDashboardResponse batchDashboardByFaculty(Long instituteId, Long facultyUserId) {
        List<BatchResponse> responses = courseMapper.toBatchResponseList(
                courseDao.findBatchesByFacultyUserId(instituteId, facultyUserId));
        int active = 0, planned = 0, completed = 0, cancelled = 0, enrolled = 0;
        for (BatchResponse b : responses) {
            switch (b.getStatus()) {
                case "ACTIVE"    -> active++;
                case "PLANNED"   -> planned++;
                case "COMPLETED" -> completed++;
                case "CANCELLED" -> cancelled++;
            }
            enrolled += b.getEnrolledCount();
        }
        return BatchDashboardResponse.builder()
                .totalBatches(responses.size()).activeBatches(active)
                .plannedBatches(planned).completedBatches(completed)
                .cancelledBatches(cancelled).totalEnrolled(enrolled)
                .active(responses.stream().filter(b -> "ACTIVE".equals(b.getStatus())).toList())
                .upcoming(responses.stream().filter(b -> "PLANNED".equals(b.getStatus())).toList())
                .build();
    }

    /** Returns true if the faculty user is assigned to the given batch via batch_faculty. */
    @Transactional(readOnly = true)
    public boolean isFacultyAssignedToBatch(Long batchId, Long facultyUserId, Long instituteId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM batch_faculty WHERE batch_id=:batchId AND faculty_user_id=:fid AND is_active=true",
                new MapSqlParameterSource().addValue("batchId", batchId).addValue("fid", facultyUserId),
                Long.class);
        return count != null && count > 0;
    }

    @Transactional(readOnly = true)
    public BatchResponse getBatch(Long id, Long instituteId) {
        Batch batch = courseDao.findBatchByIdAndInstituteId(id, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Batch", id));
        return courseMapper.toBatchResponse(batch);
    }

    @Transactional(readOnly = true)
    public List<BatchStudentRow> batchStudents(Long batchId, Long instituteId, int page, int size) {
        int capped = Math.min(size, 100);
        return jdbc.query("""
            SELECT a.id AS admission_id, a.admission_number,
                   CONCAT(a.first_name, CASE WHEN a.last_name IS NOT NULL THEN ' '||a.last_name ELSE '' END) AS student_name,
                   a.phone, a.status AS admission_status,
                   a.fees_agreed, a.fees_paid, (a.fees_agreed-a.fees_paid) AS fees_due,
                   a.enrollment_date::TEXT AS enrollment_date
            FROM admissions a
            WHERE a.batch_id=:batchId AND a.institute_id=:iid AND a.deleted_at IS NULL
            ORDER BY a.created_at DESC
            LIMIT :size OFFSET :offset
            """,
            new MapSqlParameterSource()
                .addValue("batchId", batchId)
                .addValue("iid", instituteId)
                .addValue("size", capped)
                .addValue("offset", (long) page * capped),
            (rs, rn) -> new BatchStudentRow(
                rs.getLong("admission_id"),
                rs.getString("admission_number"),
                rs.getString("student_name"),
                rs.getString("phone"),
                rs.getString("admission_status"),
                rs.getBigDecimal("fees_agreed"),
                rs.getBigDecimal("fees_paid"),
                rs.getBigDecimal("fees_due"),
                rs.getString("enrollment_date")
            ));
    }

    // ── Standalone batch CRUD (direct, not nested under course) ─────────────

    @Transactional
    public BatchResponse createBatchDirect(CreateBatchRequest request, Long courseId, Long instituteId) {
        return createBatch(courseId, request, instituteId);
    }

    @Transactional
    public BatchResponse updateBatchDirect(Long batchId, UpdateBatchRequest request, Long instituteId) {
        Batch batch = courseDao.findBatchByIdAndInstituteId(batchId, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Batch", batchId));
        if (request.getStatus() != null) {
            batch.setStatus(parseBatchStatus(request.getStatus()));
        }
        courseMapper.updateBatchEntity(batch, request);
        return courseMapper.toBatchResponse(courseDao.saveBatch(batch));
    }

    @Transactional
    public BatchResponse patchBatchStatus(Long batchId, String status, Long instituteId) {
        Batch batch = courseDao.findBatchByIdAndInstituteId(batchId, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Batch", batchId));
        batch.setStatus(parseBatchStatus(status));
        return courseMapper.toBatchResponse(courseDao.saveBatch(batch));
    }

    @Transactional
    public void deleteBatchDirect(Long batchId, Long instituteId) {
        courseDao.findBatchByIdAndInstituteId(batchId, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Batch", batchId));
        courseDao.deleteBatch(batchId);
        log.info("Batch soft-deleted: id={}", batchId);
    }

    // ── Batch dashboard ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public BatchDashboardResponse batchDashboard(Long instituteId) {
        List<Batch> all = courseDao.findBatchesByInstituteId(instituteId, null);
        List<BatchResponse> responses = courseMapper.toBatchResponseList(all);

        int active    = 0, planned = 0, completed = 0, cancelled = 0, enrolled = 0;
        for (BatchResponse b : responses) {
            switch (b.getStatus()) {
                case "ACTIVE"    -> active++;
                case "PLANNED"   -> planned++;
                case "COMPLETED" -> completed++;
                case "CANCELLED" -> cancelled++;
            }
            enrolled += b.getEnrolledCount();
        }

        List<BatchResponse> activeList  = responses.stream().filter(b -> "ACTIVE".equals(b.getStatus())).toList();
        List<BatchResponse> plannedList = responses.stream().filter(b -> "PLANNED".equals(b.getStatus())).toList();

        return BatchDashboardResponse.builder()
            .totalBatches(responses.size())
            .activeBatches(active)
            .plannedBatches(planned)
            .completedBatches(completed)
            .cancelledBatches(cancelled)
            .totalEnrolled(enrolled)
            .active(activeList)
            .upcoming(plannedList)
            .build();
    }

    // ── Batch assignment history ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<BatchAssignmentHistoryRow> getBatchAssignmentHistory(Long admissionId, Long instituteId) {
        return courseDao.findBatchAssignmentHistory(admissionId, instituteId);
    }

    // ── Capacity check helper (used by AdmissionService) ─────────────────────

    public void validateBatchCapacity(Long batchId, Long instituteId) {
        Batch batch = courseDao.findBatchByIdAndInstituteId(batchId, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Batch", batchId));
        if (batch.getMaxCapacity() != null) {
            int enrolled = courseDao.countEnrolledByBatchId(batchId);
            if (enrolled >= batch.getMaxCapacity()) {
                throw new BusinessException(
                    "Batch '" + batch.getName() + "' is full (" + enrolled + "/" + batch.getMaxCapacity() + " seats occupied)",
                    "BATCH_FULL", org.springframework.http.HttpStatus.CONFLICT);
            }
        }
    }

    public void recordAssignment(Long instituteId, Long admissionId, Long fromBatchId, Long toBatchId, String action, String notes) {
        courseDao.recordBatchAssignment(instituteId, admissionId, fromBatchId, toBatchId, action, notes, AuditUtil.getCurrentUserId());
    }

    // ── Internals ────────────────────────────────────────────────────────────

    private Course findCourseOrThrow(Long id, Long instituteId) {
        return courseDao.findCourseByIdAndInstituteId(id, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Course", id));
    }

    private static CourseStatus parseCourseStatus(String value) {
        try {
            return CourseStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(
                "Invalid status '" + value + "'. Valid: " + Arrays.toString(CourseStatus.values()),
                "INVALID_COURSE_STATUS", HttpStatus.BAD_REQUEST);
        }
    }

    private static BatchStatus parseBatchStatus(String value) {
        try {
            return BatchStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(
                "Invalid status '" + value + "'. Valid: " + Arrays.toString(BatchStatus.values()),
                "INVALID_BATCH_STATUS", HttpStatus.BAD_REQUEST);
        }
    }
}
