package com.akt.institute.material.service;

import com.akt.institute.material.domain.StudyMaterial;
import com.akt.institute.material.dto.StudyMaterialResponse;
import com.akt.institute.material.repository.StudyMaterialDao;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import com.akt.institute.shared.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudyMaterialService {

    private final StudyMaterialDao    materialDao;
    private final FileStorageService  fileStorageService;

    @Transactional(readOnly = true)
    public List<StudyMaterialResponse> list(Long instituteId, Long batchId, Long courseId, String type) {
        return materialDao.findAll(instituteId, batchId, courseId, type)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public StudyMaterialResponse addLink(Long instituteId, Long actorId,
                                         Long batchId, Long courseId, String subject,
                                         String title, String description,
                                         String materialType, String externalLink) {
        StudyMaterial m = StudyMaterial.builder()
                .instituteId(instituteId)
                .batchId(batchId).courseId(courseId).subject(subject)
                .uploadedBy(actorId)
                .title(title).description(description)
                .materialType(materialType != null ? materialType.toUpperCase() : "LINK")
                .externalLink(externalLink)
                .active(true)
                .build();
        m.setCreatedBy(actorId);
        m.setUpdatedBy(actorId);
        return toResponse(materialDao.save(m));
    }

    @Transactional
    public StudyMaterialResponse uploadFile(Long instituteId, Long actorId,
                                            Long batchId, Long courseId, String subject,
                                            String title, String description,
                                            String materialType, MultipartFile file) {
        var stored = fileStorageService.store(file, "materials");
        StudyMaterial m = StudyMaterial.builder()
                .instituteId(instituteId)
                .batchId(batchId).courseId(courseId).subject(subject)
                .uploadedBy(actorId)
                .title(title).description(description)
                .materialType(materialType != null ? materialType.toUpperCase() : "PDF")
                .fileUrl(stored.url())
                .fileName(stored.originalName())
                .fileSizeBytes(stored.sizeBytes())
                .active(true)
                .build();
        m.setCreatedBy(actorId);
        m.setUpdatedBy(actorId);
        return toResponse(materialDao.save(m));
    }

    @Transactional
    public void delete(Long id, Long instituteId, Long actorId) {
        var m = materialDao.findById(id, instituteId)
                .orElseThrow(() -> new ResourceNotFoundException("Study material not found"));
        if (m.getFileUrl() != null) fileStorageService.delete(m.getFileUrl());
        materialDao.softDelete(id, instituteId, actorId);
    }

    private StudyMaterialResponse toResponse(StudyMaterial m) {
        return StudyMaterialResponse.builder()
                .id(m.getId()).uuid(m.getUuid()).instituteId(m.getInstituteId())
                .courseId(m.getCourseId()).courseName(m.getCourseName())
                .batchId(m.getBatchId()).batchName(m.getBatchName())
                .subject(m.getSubject())
                .uploadedBy(m.getUploadedBy()).uploaderName(m.getUploaderName())
                .title(m.getTitle()).description(m.getDescription())
                .materialType(m.getMaterialType())
                .fileUrl(m.getFileUrl()).fileName(m.getFileName())
                .fileSizeBytes(m.getFileSizeBytes())
                .externalLink(m.getExternalLink())
                .active(m.isActive()).createdAt(m.getCreatedAt())
                .build();
    }
}
