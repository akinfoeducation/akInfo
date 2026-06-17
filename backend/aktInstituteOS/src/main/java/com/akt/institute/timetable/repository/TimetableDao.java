package com.akt.institute.timetable.repository;

import com.akt.institute.timetable.domain.TimetableEntry;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TimetableDao {
    List<TimetableEntry> findAll(Long instituteId, Long batchId, Long facultyUserId);
    List<TimetableEntry> findForDay(Long instituteId, int dayOfWeek, LocalDate date);
    List<TimetableEntry> findByFaculty(Long facultyUserId, Long instituteId);
    Optional<TimetableEntry> findById(Long id, Long instituteId);
    TimetableEntry save(TimetableEntry entry);
    void delete(Long id, Long instituteId, Long actorId);
}
