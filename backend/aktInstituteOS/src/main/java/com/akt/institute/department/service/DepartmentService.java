package com.akt.institute.department.service;

import com.akt.institute.audit.domain.AuditAction;
import com.akt.institute.audit.service.AuditService;
import com.akt.institute.department.domain.Department;
import com.akt.institute.department.dto.DepartmentRequest;
import com.akt.institute.department.dto.DepartmentResponse;
import com.akt.institute.department.repository.DepartmentDao;
import com.akt.institute.shared.exception.DuplicateResourceException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentDao departmentDao;
    private final AuditService  auditService;

    @Transactional(readOnly = true)
    public List<DepartmentResponse> list(Long instituteId) {
        return departmentDao.findAllByInstituteId(instituteId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public DepartmentResponse get(Long id, Long instituteId) {
        return toResponse(findOrThrow(id, instituteId));
    }

    @Transactional
    public DepartmentResponse create(DepartmentRequest req, Long instituteId, Long actorId, String ip, String ua) {
        String code = req.getCode().toUpperCase();
        if (departmentDao.existsByCodeAndInstituteId(code, instituteId))
            throw new DuplicateResourceException("Department code '" + code + "' already exists");
        Department dept = Department.builder()
                .uuid(UUID.randomUUID().toString()).instituteId(instituteId)
                .name(req.getName().trim()).code(code).description(req.getDescription())
                .isActive(req.isActive()).build();
        dept = departmentDao.save(dept);
        auditService.log(instituteId, actorId, AuditAction.DEPT_CREATED, "DEPARTMENT", String.valueOf(dept.getId()), ip, ua);
        return toResponse(dept);
    }

    @Transactional
    public DepartmentResponse update(Long id, DepartmentRequest req, Long instituteId, Long actorId, String ip, String ua) {
        Department dept = findOrThrow(id, instituteId);
        String newCode = req.getCode().toUpperCase();
        if (!newCode.equals(dept.getCode()) && departmentDao.existsByCodeAndInstituteId(newCode, instituteId))
            throw new DuplicateResourceException("Department code '" + newCode + "' already exists");
        dept.setName(req.getName().trim()); dept.setCode(newCode);
        dept.setDescription(req.getDescription()); dept.setActive(req.isActive());
        departmentDao.save(dept);
        auditService.log(instituteId, actorId, AuditAction.DEPT_UPDATED, "DEPARTMENT", String.valueOf(id), ip, ua);
        return toResponse(dept);
    }

    @Transactional
    public void delete(Long id, Long instituteId, Long actorId, String ip, String ua) {
        findOrThrow(id, instituteId);
        departmentDao.softDelete(id, actorId);
        auditService.log(instituteId, actorId, AuditAction.DEPT_DELETED, "DEPARTMENT", String.valueOf(id), ip, ua);
    }

    private Department findOrThrow(Long id, Long instituteId) {
        return departmentDao.findByIdAndInstituteId(id, instituteId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
    }

    private DepartmentResponse toResponse(Department d) {
        return DepartmentResponse.builder()
                .id(d.getId()).uuid(d.getUuid()).instituteId(d.getInstituteId())
                .name(d.getName()).code(d.getCode()).description(d.getDescription())
                .active(d.isActive()).createdAt(d.getCreatedAt()).updatedAt(d.getUpdatedAt())
                .build();
    }
}
