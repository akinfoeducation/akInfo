package com.akt.institute.branch.repository;

import com.akt.institute.branch.domain.Branch;
import java.util.List;
import java.util.Optional;

public interface BranchDao {
    Branch save(Branch branch);
    Optional<Branch> findByIdAndInstituteId(Long id, Long instituteId);
    List<Branch> findAllByInstituteId(Long instituteId);
    boolean existsByCodeAndInstituteId(String code, Long instituteId);
    void softDelete(Long id, Long deletedBy);
}
