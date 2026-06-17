package com.akt.institute.material.repository;

import com.akt.institute.material.domain.StudyMaterial;

import java.util.List;
import java.util.Optional;

public interface StudyMaterialDao {
    List<StudyMaterial> findAll(Long instituteId, Long batchId, Long courseId, String type);
    Optional<StudyMaterial> findById(Long id, Long instituteId);
    StudyMaterial save(StudyMaterial material);
    void softDelete(Long id, Long instituteId, Long actorId);
}
