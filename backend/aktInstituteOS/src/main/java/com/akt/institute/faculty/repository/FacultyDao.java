package com.akt.institute.faculty.repository;

import com.akt.institute.faculty.domain.FacultyProfile;

import java.util.List;
import java.util.Optional;

public interface FacultyDao {
    List<FacultyProfile> findAll(Long instituteId);
    Optional<FacultyProfile> findByUserId(Long userId, Long instituteId);
    Optional<FacultyProfile> findById(Long id, Long instituteId);
    FacultyProfile upsert(FacultyProfile profile);
}
