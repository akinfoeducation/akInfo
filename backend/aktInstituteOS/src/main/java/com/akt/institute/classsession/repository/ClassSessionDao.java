package com.akt.institute.classsession.repository;

import com.akt.institute.classsession.domain.ClassSession;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ClassSessionDao {
    List<ClassSession> findAll(Long instituteId, Long batchId, Long facultyUserId,
                               LocalDate from, LocalDate to);
    Optional<ClassSession> findById(Long id, Long instituteId);
    ClassSession save(ClassSession session);
    void markAttendanceDone(Long id, Long instituteId);
}
