package com.akt.institute.department.repository;

import com.akt.institute.department.domain.Department;
import java.util.List;
import java.util.Optional;

public interface DepartmentDao {
    Department save(Department dept);
    Optional<Department> findByIdAndInstituteId(Long id, Long instituteId);
    List<Department> findAllByInstituteId(Long instituteId);
    boolean existsByCodeAndInstituteId(String code, Long instituteId);
    void softDelete(Long id, Long deletedBy);
}
