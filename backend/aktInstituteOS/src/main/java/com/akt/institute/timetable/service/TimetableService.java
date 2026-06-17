package com.akt.institute.timetable.service;

import com.akt.institute.shared.exception.ResourceNotFoundException;
import com.akt.institute.timetable.domain.TimetableEntry;
import com.akt.institute.timetable.dto.TimetableRequest;
import com.akt.institute.timetable.dto.TimetableResponse;
import com.akt.institute.timetable.repository.TimetableDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableDao timetableDao;

    @Transactional(readOnly = true)
    public List<TimetableResponse> list(Long instituteId, Long batchId, Long facultyUserId) {
        return timetableDao.findAll(instituteId, batchId, facultyUserId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<TimetableResponse> today(Long instituteId, Long facultyUserId) {
        LocalDate today = LocalDate.now();
        int dow = today.getDayOfWeek().getValue(); // ISO: 1=Mon..7=Sun
        return timetableDao.findForDay(instituteId, dow, today)
                .stream()
                .filter(e -> facultyUserId == null || facultyUserId.equals(e.getFacultyUserId()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TimetableResponse> mySchedule(Long facultyUserId, Long instituteId) {
        return timetableDao.findByFaculty(facultyUserId, instituteId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public TimetableResponse create(Long instituteId, Long actorId, TimetableRequest req) {
        TimetableEntry e = buildEntry(req);
        e.setInstituteId(instituteId);
        e.setCreatedBy(actorId);
        e.setUpdatedBy(actorId);
        e.setActive(true);
        return toResponse(timetableDao.save(e));
    }

    @Transactional
    public TimetableResponse update(Long id, Long instituteId, Long actorId, TimetableRequest req) {
        TimetableEntry existing = timetableDao.findById(id, instituteId)
                .orElseThrow(() -> new ResourceNotFoundException("Timetable entry not found"));
        TimetableEntry e = buildEntry(req);
        e.setId(id);
        e.setInstituteId(instituteId);
        e.setActive(existing.isActive());
        e.setCreatedBy(existing.getCreatedBy());
        e.setUpdatedBy(actorId);
        return toResponse(timetableDao.save(e));
    }

    @Transactional
    public void delete(Long id, Long instituteId, Long actorId) {
        timetableDao.findById(id, instituteId)
                .orElseThrow(() -> new ResourceNotFoundException("Timetable entry not found"));
        timetableDao.delete(id, instituteId, actorId);
    }

    private TimetableEntry buildEntry(TimetableRequest req) {
        return TimetableEntry.builder()
                .batchId(req.getBatchId())
                .facultyUserId(req.getFacultyUserId())
                .subject(req.getSubject())
                .dayOfWeek(req.getDayOfWeek())
                .specificDate(req.getSpecificDate())
                .startTime(req.getStartTime() != null ? LocalTime.parse(req.getStartTime()) : null)
                .endTime(req.getEndTime()     != null ? LocalTime.parse(req.getEndTime())   : null)
                .classroom(req.getClassroom())
                .mode(req.getMode() != null ? req.getMode() : "OFFLINE")
                .onlineLink(req.getOnlineLink())
                .effectiveFrom(req.getEffectiveFrom())
                .effectiveUntil(req.getEffectiveUntil())
                .build();
    }

    private TimetableResponse toResponse(TimetableEntry e) {
        String dayName = null;
        if (e.getDayOfWeek() != null) {
            dayName = DayOfWeek.of(e.getDayOfWeek()).getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        }
        return TimetableResponse.builder()
                .id(e.getId())
                .uuid(e.getUuid())
                .instituteId(e.getInstituteId())
                .batchId(e.getBatchId())
                .batchName(e.getBatchName())
                .facultyUserId(e.getFacultyUserId())
                .facultyName(e.getFacultyName())
                .subject(e.getSubject())
                .dayOfWeek(e.getDayOfWeek())
                .dayName(dayName)
                .specificDate(e.getSpecificDate())
                .startTime(e.getStartTime()     != null ? e.getStartTime().toString()     : null)
                .endTime(e.getEndTime()         != null ? e.getEndTime().toString()       : null)
                .classroom(e.getClassroom())
                .mode(e.getMode())
                .onlineLink(e.getOnlineLink())
                .effectiveFrom(e.getEffectiveFrom())
                .effectiveUntil(e.getEffectiveUntil())
                .active(e.isActive())
                .createdAt(e.getCreatedAt())
                .build();
    }
}
