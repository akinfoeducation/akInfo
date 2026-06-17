package com.akt.institute.faculty.service;

import com.akt.institute.faculty.domain.FacultyProfile;
import com.akt.institute.faculty.dto.FacultyProfileRequest;
import com.akt.institute.faculty.dto.FacultyProfileResponse;
import com.akt.institute.faculty.repository.FacultyDao;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FacultyService {

    private final FacultyDao facultyDao;

    @Transactional(readOnly = true)
    public List<FacultyProfileResponse> list(Long instituteId) {
        return facultyDao.findAll(instituteId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public FacultyProfileResponse getByUserId(Long userId, Long instituteId) {
        return facultyDao.findByUserId(userId, instituteId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty profile not found"));
    }

    @Transactional(readOnly = true)
    public FacultyProfileResponse getById(Long id, Long instituteId) {
        return facultyDao.findById(id, instituteId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty profile not found"));
    }

    @Transactional
    public FacultyProfileResponse upsert(Long userId, Long instituteId, Long actorId,
                                         FacultyProfileRequest req) {
        FacultyProfile fp = FacultyProfile.builder()
                .userId(userId)
                .instituteId(instituteId)
                .qualification(req.getQualification())
                .experienceYears(req.getExperienceYears())
                .subjects(req.getSubjects())
                .skills(req.getSkills())
                .employeeType(req.getEmployeeType() != null ? req.getEmployeeType() : "FULL_TIME")
                .bio(req.getBio())
                .linkedinUrl(req.getLinkedinUrl())
                .build();
        fp.setCreatedBy(actorId);
        fp.setUpdatedBy(actorId);
        return toResponse(facultyDao.upsert(fp));
    }

    private FacultyProfileResponse toResponse(FacultyProfile fp) {
        String full = (fp.getFirstName() != null ? fp.getFirstName() : "")
                + (fp.getLastName() != null && !fp.getLastName().isBlank() ? " " + fp.getLastName() : "");
        return FacultyProfileResponse.builder()
                .id(fp.getId())
                .userId(fp.getUserId())
                .instituteId(fp.getInstituteId())
                .firstName(fp.getFirstName())
                .lastName(fp.getLastName())
                .fullName(full.trim())
                .email(fp.getEmail())
                .phone(fp.getPhone())
                .avatarUrl(fp.getAvatarUrl())
                .designation(fp.getDesignation())
                .employeeId(fp.getEmployeeId())
                .username(fp.getUsername())
                .qualification(fp.getQualification())
                .experienceYears(fp.getExperienceYears())
                .subjects(fp.getSubjects())
                .skills(fp.getSkills())
                .employeeType(fp.getEmployeeType())
                .bio(fp.getBio())
                .linkedinUrl(fp.getLinkedinUrl())
                .createdAt(fp.getCreatedAt())
                .updatedAt(fp.getUpdatedAt())
                .build();
    }
}
