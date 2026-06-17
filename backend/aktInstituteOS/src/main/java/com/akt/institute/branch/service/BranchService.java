package com.akt.institute.branch.service;

import com.akt.institute.audit.domain.AuditAction;
import com.akt.institute.audit.service.AuditService;
import com.akt.institute.branch.domain.Branch;
import com.akt.institute.branch.dto.BranchRequest;
import com.akt.institute.branch.dto.BranchResponse;
import com.akt.institute.branch.repository.BranchDao;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.DuplicateResourceException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BranchService {

    private final BranchDao branchDao;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<BranchResponse> list(Long instituteId) {
        return branchDao.findAllByInstituteId(instituteId).stream()
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public BranchResponse get(Long id, Long instituteId) {
        return toResponse(findOrThrow(id, instituteId));
    }

    @Transactional
    public BranchResponse create(BranchRequest req, Long instituteId, Long actorId, String ip, String ua) {
        String code = req.getCode().toUpperCase();
        if (branchDao.existsByCodeAndInstituteId(code, instituteId)) {
            throw new DuplicateResourceException("Branch code '" + code + "' already exists in this institute");
        }
        Branch branch = Branch.builder()
                .uuid(UUID.randomUUID().toString())
                .instituteId(instituteId)
                .name(req.getName().trim())
                .code(code)
                .address(req.getAddress())
                .city(req.getCity())
                .phone(req.getPhone())
                .email(req.getEmail())
                .isActive(req.isActive())
                .build();
        branch = branchDao.save(branch);
        auditService.log(instituteId, actorId, AuditAction.BRANCH_CREATED, "BRANCH",
                String.valueOf(branch.getId()), ip, ua);
        return toResponse(branch);
    }

    @Transactional
    public BranchResponse update(Long id, BranchRequest req, Long instituteId, Long actorId, String ip, String ua) {
        Branch branch = findOrThrow(id, instituteId);
        String newCode = req.getCode().toUpperCase();
        if (!newCode.equals(branch.getCode()) && branchDao.existsByCodeAndInstituteId(newCode, instituteId)) {
            throw new DuplicateResourceException("Branch code '" + newCode + "' already exists in this institute");
        }
        branch.setName(req.getName().trim());
        branch.setCode(newCode);
        branch.setAddress(req.getAddress());
        branch.setCity(req.getCity());
        branch.setPhone(req.getPhone());
        branch.setEmail(req.getEmail());
        branch.setActive(req.isActive());
        branchDao.save(branch);
        auditService.log(instituteId, actorId, AuditAction.BRANCH_UPDATED, "BRANCH",
                String.valueOf(id), ip, ua);
        return toResponse(branch);
    }

    @Transactional
    public void delete(Long id, Long instituteId, Long actorId, String ip, String ua) {
        findOrThrow(id, instituteId);
        branchDao.softDelete(id, actorId);
        auditService.log(instituteId, actorId, AuditAction.BRANCH_DELETED, "BRANCH",
                String.valueOf(id), ip, ua);
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private Branch findOrThrow(Long id, Long instituteId) {
        return branchDao.findByIdAndInstituteId(id, instituteId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found"));
    }

    private BranchResponse toResponse(Branch b) {
        return BranchResponse.builder()
                .id(b.getId()).uuid(b.getUuid()).instituteId(b.getInstituteId())
                .name(b.getName()).code(b.getCode()).address(b.getAddress())
                .city(b.getCity()).phone(b.getPhone()).email(b.getEmail())
                .active(b.isActive()).createdAt(b.getCreatedAt()).updatedAt(b.getUpdatedAt())
                .build();
    }
}
