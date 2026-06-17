package com.akt.institute.classsession.service;

import com.akt.institute.classsession.domain.ClassSession;
import com.akt.institute.classsession.dto.ClassSessionRequest;
import com.akt.institute.classsession.dto.ClassSessionResponse;
import com.akt.institute.classsession.repository.ClassSessionDao;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassSessionService {

    private final ClassSessionDao sessionDao;

    @Transactional(readOnly = true)
    public List<ClassSessionResponse> list(Long instituteId, Long batchId,
                                           Long facultyUserId, LocalDate from, LocalDate to) {
        return sessionDao.findAll(instituteId, batchId, facultyUserId, from, to)
                .stream().map(this::toResponse).toList();
    }

    /**
     * @param requiredFacultyId when non-null (faculty caller), the session must belong to this user
     */
    @Transactional(readOnly = true)
    public ClassSessionResponse get(Long id, Long instituteId, Long requiredFacultyId) {
        ClassSession session = sessionDao.findById(id, instituteId)
                .orElseThrow(() -> new ResourceNotFoundException("Class session not found"));
        verifyFacultyOwnership(session, requiredFacultyId);
        return toResponse(session);
    }

    @Transactional
    public ClassSessionResponse create(Long instituteId, Long actorId, ClassSessionRequest req) {
        ClassSession s = build(req);
        s.setInstituteId(instituteId);
        s.setCreatedBy(actorId);
        s.setUpdatedBy(actorId);
        if (s.getFacultyUserId() == null) s.setFacultyUserId(actorId);
        return toResponse(sessionDao.save(s));
    }

    /**
     * @param requiredFacultyId when non-null (faculty caller), the session must belong to this user
     */
    @Transactional
    public ClassSessionResponse update(Long id, Long instituteId, Long actorId,
                                       ClassSessionRequest req, Long requiredFacultyId) {
        ClassSession existing = sessionDao.findById(id, instituteId)
                .orElseThrow(() -> new ResourceNotFoundException("Class session not found"));
        verifyFacultyOwnership(existing, requiredFacultyId);
        ClassSession s = build(req);
        s.setId(id);
        s.setInstituteId(instituteId);
        s.setAttendanceMarked(existing.isAttendanceMarked());
        s.setCreatedBy(existing.getCreatedBy());
        s.setUpdatedBy(actorId);
        return toResponse(sessionDao.save(s));
    }

    private void verifyFacultyOwnership(ClassSession session, Long requiredFacultyId) {
        if (requiredFacultyId != null && !requiredFacultyId.equals(session.getFacultyUserId())) {
            throw new BusinessException(
                    "Access denied: this session belongs to a different faculty member",
                    "SESSION_ACCESS_DENIED", HttpStatus.FORBIDDEN);
        }
    }

    private ClassSession build(ClassSessionRequest req) {
        return ClassSession.builder()
                .batchId(req.getBatchId())
                .facultyUserId(req.getFacultyUserId())
                .timetableId(req.getTimetableId())
                .sessionDate(req.getSessionDate())
                .startTime(req.getStartTime() != null ? LocalTime.parse(req.getStartTime()) : null)
                .endTime(req.getEndTime()     != null ? LocalTime.parse(req.getEndTime())   : null)
                .subject(req.getSubject())
                .topicCovered(req.getTopicCovered())
                .sessionNotes(req.getSessionNotes())
                .homeworkNotes(req.getHomeworkNotes())
                .status(req.getStatus() != null ? req.getStatus() : "SCHEDULED")
                .build();
    }

    private ClassSessionResponse toResponse(ClassSession s) {
        return ClassSessionResponse.builder()
                .id(s.getId()).uuid(s.getUuid()).instituteId(s.getInstituteId())
                .batchId(s.getBatchId()).batchName(s.getBatchName())
                .timetableId(s.getTimetableId())
                .facultyUserId(s.getFacultyUserId()).facultyName(s.getFacultyName())
                .sessionDate(s.getSessionDate())
                .startTime(s.getStartTime() != null ? s.getStartTime().toString() : null)
                .endTime(s.getEndTime()     != null ? s.getEndTime().toString()   : null)
                .subject(s.getSubject())
                .topicCovered(s.getTopicCovered()).sessionNotes(s.getSessionNotes())
                .homeworkNotes(s.getHomeworkNotes()).status(s.getStatus())
                .attendanceMarked(s.isAttendanceMarked())
                .presentCount(s.getPresentCount()).totalStudents(s.getTotalStudents())
                .createdAt(s.getCreatedAt()).updatedAt(s.getUpdatedAt())
                .build();
    }
}
