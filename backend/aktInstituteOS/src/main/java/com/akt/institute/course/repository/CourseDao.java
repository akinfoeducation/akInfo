package com.akt.institute.course.repository;

import com.akt.institute.course.domain.Batch;
import com.akt.institute.course.domain.Course;
import com.akt.institute.course.dto.BatchAssignmentHistoryRow;

import java.util.List;
import java.util.Optional;

public interface CourseDao {

    Course saveCourse(Course course);

    Optional<Course> findCourseByIdAndInstituteId(Long id, Long instituteId);

    boolean existsByCodeAndInstituteId(String code, Long instituteId);

    List<Course> findCoursesByInstituteId(Long instituteId, String status);

    int countBatchesByCourseId(Long courseId);

    Batch saveBatch(Batch batch);

    Optional<Batch> findBatchByIdAndCourseId(Long id, Long courseId, Long instituteId);

    Optional<Batch> findBatchByIdAndInstituteId(Long id, Long instituteId);

    List<Batch> findBatchesByCourseId(Long courseId, Long instituteId);

    List<Batch> findBatchesByInstituteId(Long instituteId, String status);

    void deleteCourse(Long id);

    void deleteBatch(Long id);

    int countEnrolledByBatchId(Long batchId);

    void recordBatchAssignment(Long instituteId, Long admissionId, Long fromBatchId, Long toBatchId, String action, String notes, Long actorId);

    List<BatchAssignmentHistoryRow> findBatchAssignmentHistory(Long admissionId, Long instituteId);
}
