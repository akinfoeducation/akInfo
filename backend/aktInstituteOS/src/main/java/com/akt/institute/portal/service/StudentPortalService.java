package com.akt.institute.portal.service;

import com.akt.institute.attendance.dto.AttendanceSummaryResponse;
import com.akt.institute.attendance.dto.StudentAttendanceResponse;
import com.akt.institute.attendance.repository.AttendanceDao;
import com.akt.institute.auth.domain.User;
import com.akt.institute.auth.repository.UserDao;
import com.akt.institute.material.dto.StudyMaterialResponse;
import com.akt.institute.material.repository.StudyMaterialDao;
import com.akt.institute.portal.dto.PortalActivateRequest;
import com.akt.institute.portal.dto.StudentPortalDashboard;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import com.akt.institute.timetable.dto.TimetableResponse;
import com.akt.institute.timetable.service.TimetableService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentPortalService {

    private final NamedParameterJdbcTemplate jdbc;
    private final UserDao                    userDao;
    private final PasswordEncoder            passwordEncoder;
    private final AttendanceDao              attendanceDao;
    private final StudyMaterialDao           materialDao;
    private final TimetableService           timetableService;

    // ── Activate portal for a student ────────────────────────────────────────

    @Transactional
    public void activatePortal(Long studentId, Long instituteId, Long actorId,
                                PortalActivateRequest req) {
        // Fetch student record
        var student = fetchStudent(studentId, instituteId);
        Long existingUserId = (Long) student.get("user_id");

        if (existingUserId != null) {
            throw new BusinessException("Portal is already activated for this student",
                    "PORTAL_ALREADY_ACTIVE", HttpStatus.CONFLICT);
        }

        String firstName  = (String) student.get("first_name");
        String lastName   = (String) student.get("last_name");
        String email      = (String) student.get("email");
        String phone      = (String) student.get("phone");
        String studentNum = (String) student.get("student_number");

        // Derive username from student number (lowercase, replace dashes)
        String username   = studentNum.toLowerCase().replace("-", ".");
        String passwordHash = passwordEncoder.encode(req.getPassword());

        // Find STUDENT role for this institute
        Long studentRoleId = fetchStudentRoleId(instituteId);

        // Create user account
        User newUser = User.builder()
                .uuid(UUID.randomUUID().toString())
                .instituteId(instituteId)
                .username(username)
                .email(email)
                .passwordHash(passwordHash)
                .firstName(firstName)
                .lastName(lastName)
                .phone(phone)
                .isActive(true)
                .isEmailVerified(false)
                .build();
        newUser.setCreatedBy(actorId);
        newUser.setUpdatedBy(actorId);
        newUser.setCreatedAt(Instant.now());
        newUser.setUpdatedAt(Instant.now());

        User savedUser = userDao.save(newUser);

        // Assign STUDENT role
        jdbc.update("INSERT INTO user_roles(user_id, role_id) VALUES(:uid,:rid) ON CONFLICT DO NOTHING",
                Map.of("uid", savedUser.getId(), "rid", studentRoleId));

        // Link student ↔ user
        jdbc.update("UPDATE students SET user_id=:uid WHERE id=:sid AND institute_id=:iid",
                Map.of("uid", savedUser.getId(), "sid", studentId, "iid", instituteId));

        log.info("Portal activated: student={} user={} institute={}", studentId, savedUser.getId(), instituteId);
    }

    // ── Student dashboard ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public StudentPortalDashboard getDashboard(Long userId, Long instituteId) {
        // Find student linked to this user
        var studentRow = jdbc.queryForMap("""
                SELECT s.id student_id, s.student_number, s.first_name, s.last_name,
                       s.email, s.phone, s.photo_url
                FROM students s
                WHERE s.user_id=:uid AND s.institute_id=:iid AND s.deleted_at IS NULL
                LIMIT 1
                """, Map.of("uid", userId, "iid", instituteId));

        Long studentId = (Long) studentRow.get("student_id");

        // Latest active admission + batch info
        var admissions = jdbc.queryForList("""
                SELECT a.id admission_id, a.course_name, a.batch_name,
                       b.batch_code, b.timing batch_timing, b.mode batch_mode, b.faculty_name
                FROM admissions a
                LEFT JOIN batches b ON b.id = a.batch_id
                WHERE a.student_id=:sid AND a.institute_id=:iid AND a.deleted_at IS NULL
                  AND a.status='ENROLLED'
                ORDER BY a.enrollment_date DESC
                LIMIT 1
                """, Map.of("sid", studentId, "iid", instituteId));

        // Attendance summary
        AttendanceSummaryResponse summary = attendanceDao.summaryForStudent(studentId, instituteId);

        // Today's schedule (get batch_id from admission)
        List<TimetableResponse> todaySchedule = List.of();
        if (!admissions.isEmpty()) {
            var adm = admissions.get(0);
            // Find batchId from the batch_name lookup
            var batchRows = jdbc.queryForList("""
                    SELECT id FROM batches WHERE batch_code=:code AND institute_id=:iid
                    """, Map.of("code", adm.get("batch_code"), "iid", instituteId));
            if (!batchRows.isEmpty()) {
                Long batchId = (Long) batchRows.get(0).get("id");
                LocalDate today = LocalDate.now();
                int dow = today.getDayOfWeek().getValue();
                todaySchedule = timetableService.list(instituteId, batchId, null);
            }
        }

        String fullName = (String) studentRow.get("first_name");
        String ln = (String) studentRow.get("last_name");
        if (ln != null && !ln.isBlank()) fullName += " " + ln;

        var builder = StudentPortalDashboard.builder()
                .studentId(studentId)
                .studentNumber((String) studentRow.get("student_number"))
                .fullName(fullName)
                .avatarUrl((String) studentRow.get("photo_url"))
                .email((String) studentRow.get("email"))
                .phone((String) studentRow.get("phone"))
                .attendanceSummary(summary)
                .todaySchedule(todaySchedule)
                .portalActive(true);

        if (!admissions.isEmpty()) {
            var a = admissions.get(0);
            builder.admissionId((Long)   a.get("admission_id"))
                   .courseName((String)  a.get("course_name"))
                   .batchName((String)   a.get("batch_name"))
                   .batchCode((String)   a.get("batch_code"))
                   .batchTiming((String) a.get("batch_timing"))
                   .batchMode((String)   a.get("batch_mode"))
                   .facultyName((String) a.get("faculty_name"));
        }

        return builder.build();
    }

    // ── Student's own attendance history ─────────────────────────────────────

    @Transactional(readOnly = true)
    public List<StudentAttendanceResponse> getMyAttendance(Long userId, Long instituteId,
                                                            LocalDate from, LocalDate to) {
        Long studentId = fetchStudentIdByUser(userId, instituteId);
        return attendanceDao.findByStudent(studentId, instituteId, from, to);
    }

    @Transactional(readOnly = true)
    public AttendanceSummaryResponse getMyAttendanceSummary(Long userId, Long instituteId) {
        Long studentId = fetchStudentIdByUser(userId, instituteId);
        return attendanceDao.summaryForStudent(studentId, instituteId);
    }

    // ── Student's study materials ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<StudyMaterialResponse> getMyMaterials(Long userId, Long instituteId) {
        Long batchId = fetchStudentBatchId(userId, instituteId);
        var materials = materialDao.findAll(instituteId, batchId, null, null);
        return materials.stream()
                .map(m -> StudyMaterialResponse.builder()
                        .id(m.getId()).uuid(m.getUuid())
                        .batchId(m.getBatchId()).batchName(m.getBatchName())
                        .courseId(m.getCourseId()).courseName(m.getCourseName())
                        .subject(m.getSubject())
                        .uploadedBy(m.getUploadedBy()).uploaderName(m.getUploaderName())
                        .title(m.getTitle()).description(m.getDescription())
                        .materialType(m.getMaterialType())
                        .fileUrl(m.getFileUrl()).fileName(m.getFileName())
                        .fileSizeBytes(m.getFileSizeBytes())
                        .externalLink(m.getExternalLink())
                        .active(m.isActive()).createdAt(m.getCreatedAt())
                        .build())
                .toList();
    }

    // ── Student's timetable ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TimetableResponse> getMySchedule(Long userId, Long instituteId) {
        Long batchId = fetchStudentBatchId(userId, instituteId);
        return timetableService.list(instituteId, batchId, null);
    }

    // ── Check portal status ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public boolean isPortalActive(Long studentId, Long instituteId) {
        var rows = jdbc.queryForList(
                "SELECT user_id FROM students WHERE id=:sid AND institute_id=:iid AND deleted_at IS NULL",
                Map.of("sid", studentId, "iid", instituteId));
        return !rows.isEmpty() && rows.get(0).get("user_id") != null;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Map<String, Object> fetchStudent(Long studentId, Long instituteId) {
        var rows = jdbc.queryForList("""
                SELECT id, student_number, first_name, last_name, email, phone, user_id
                FROM students WHERE id=:sid AND institute_id=:iid AND deleted_at IS NULL
                """, Map.of("sid", studentId, "iid", instituteId));
        if (rows.isEmpty()) throw new ResourceNotFoundException("Student not found");
        return rows.get(0);
    }

    private Long fetchStudentRoleId(Long instituteId) {
        var rows = jdbc.queryForList(
                "SELECT id FROM roles WHERE code='STUDENT' AND institute_id=:iid",
                Map.of("iid", instituteId));
        if (rows.isEmpty()) throw new ResourceNotFoundException("STUDENT role not configured for this institute");
        return (Long) rows.get(0).get("id");
    }

    private Long fetchStudentIdByUser(Long userId, Long instituteId) {
        var rows = jdbc.queryForList(
                "SELECT id FROM students WHERE user_id=:uid AND institute_id=:iid AND deleted_at IS NULL",
                Map.of("uid", userId, "iid", instituteId));
        if (rows.isEmpty()) throw new ResourceNotFoundException("Student record not found for this account");
        return (Long) rows.get(0).get("id");
    }

    private Long fetchStudentBatchId(Long userId, Long instituteId) {
        var rows = jdbc.queryForList("""
                SELECT b.id FROM admissions a
                JOIN batches b ON b.id = a.batch_id
                JOIN students s ON s.id = a.student_id
                WHERE s.user_id=:uid AND a.institute_id=:iid
                  AND a.status='ENROLLED' AND a.deleted_at IS NULL
                ORDER BY a.enrollment_date DESC LIMIT 1
                """, Map.of("uid", userId, "iid", instituteId));
        if (rows.isEmpty()) return null;
        return (Long) rows.get(0).get("id");
    }
}
