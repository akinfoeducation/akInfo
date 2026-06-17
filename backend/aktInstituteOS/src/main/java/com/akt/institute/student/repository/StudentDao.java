package com.akt.institute.student.repository;

import com.akt.institute.student.domain.Student;
import com.akt.institute.student.domain.StudentStatus;

import java.util.List;
import java.util.Optional;

public interface StudentDao {

    Student save(Student student);

    Optional<Student> findByIdAndInstituteId(Long id, Long instituteId);

    Optional<Student> findByStudentNumberAndInstituteId(String studentNumber, Long instituteId);

    boolean existsByPhoneAndInstituteId(String phone, Long instituteId);

    boolean existsByEmailAndInstituteId(String email, Long instituteId);

    boolean existsByPhoneAndInstituteIdAndIdNot(String phone, Long instituteId, Long excludeId);

    boolean existsByEmailAndInstituteIdAndIdNot(String email, Long instituteId, Long excludeId);

    /**
     * @param facultyUserId when non-null, restricts results to students enrolled in
     *                      batches assigned to this faculty user via batch_faculty.
     */
    List<Student> findWithFilters(Long instituteId, String status, String q,
                                  int page, int size, String sortField, String sortDir,
                                  Long facultyUserId);

    long countWithFilters(Long instituteId, String status, String q, Long facultyUserId);

    List<Student> findAllByIds(List<Long> ids);

    List<Student> findAllByInstituteIdForReindex(Long instituteId);

    long countByInstituteIdAndStatus(Long instituteId, StudentStatus status);
}
