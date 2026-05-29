package com.akt.institute.student.repository;

import com.akt.institute.student.domain.StudentDocument;

import java.util.List;
import java.util.Optional;

public interface StudentDocumentDao {

    StudentDocument save(StudentDocument document);

    List<StudentDocument> findAllByStudentId(Long studentId);

    Optional<StudentDocument> findByIdAndStudentId(Long id, Long studentId);
}
