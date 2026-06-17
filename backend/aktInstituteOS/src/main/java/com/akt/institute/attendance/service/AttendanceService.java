package com.akt.institute.attendance.service;

import com.akt.institute.attendance.dto.*;
import com.akt.institute.attendance.repository.AttendanceDao;
import com.akt.institute.classsession.domain.ClassSession;
import com.akt.institute.classsession.repository.ClassSessionDao;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceDao   attendanceDao;
    private final ClassSessionDao sessionDao;

    /**
     * @param requiredFacultyId when non-null, verifies session belongs to this faculty user
     */
    @Transactional(readOnly = true)
    public List<StudentAttendanceResponse> getSessionRoster(Long sessionId, Long instituteId,
                                                             Long requiredFacultyId) {
        ClassSession session = sessionDao.findById(sessionId, instituteId)
                .orElseThrow(() -> new ResourceNotFoundException("Class session not found"));
        verifyFacultyOwnership(session, requiredFacultyId);
        return attendanceDao.findBySession(sessionId, instituteId);
    }

    /**
     * @param requiredFacultyId when non-null, the session must be assigned to this faculty user
     */
    @Transactional
    public void markAttendance(Long sessionId, Long instituteId, Long markedBy,
                               MarkAttendanceRequest req, Long requiredFacultyId) {
        ClassSession session = sessionDao.findById(sessionId, instituteId)
                .orElseThrow(() -> new ResourceNotFoundException("Class session not found"));
        verifyFacultyOwnership(session, requiredFacultyId);
        for (var entry : req.getEntries()) {
            attendanceDao.upsert(sessionId, session.getBatchId(), entry.getStudentId(),
                    instituteId, entry.getStatus(), entry.getRemarks(), markedBy);
        }
        sessionDao.markAttendanceDone(sessionId, instituteId);
    }

    @Transactional(readOnly = true)
    public List<StudentAttendanceResponse> getStudentHistory(Long studentId, Long instituteId,
                                                              LocalDate from, LocalDate to) {
        return attendanceDao.findByStudent(studentId, instituteId, from, to);
    }

    @Transactional(readOnly = true)
    public List<AttendanceSummaryResponse> getBatchSummary(Long batchId, Long instituteId) {
        return attendanceDao.summaryByBatch(batchId, instituteId);
    }

    @Transactional(readOnly = true)
    public AttendanceSummaryResponse getStudentSummary(Long studentId, Long instituteId) {
        return attendanceDao.summaryForStudent(studentId, instituteId);
    }

    private void verifyFacultyOwnership(ClassSession session, Long requiredFacultyId) {
        if (requiredFacultyId != null && !requiredFacultyId.equals(session.getFacultyUserId())) {
            throw new BusinessException(
                    "Access denied: you are not the assigned faculty for this session",
                    "SESSION_ACCESS_DENIED", HttpStatus.FORBIDDEN);
        }
    }
}
