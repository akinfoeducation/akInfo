package com.akt.institute.fees.repository;

import com.akt.institute.fees.domain.FeePayment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FeePaymentDao {

    FeePayment save(FeePayment payment);

    Optional<FeePayment> findByIdAndInstituteId(Long id, Long instituteId);

    List<FeePayment> findWithFilters(Long instituteId, Long admissionId,
                                     String paymentMode, LocalDate from, LocalDate to,
                                     int page, int size);

    long countWithFilters(Long instituteId, Long admissionId,
                          String paymentMode, LocalDate from, LocalDate to);

    BigDecimal sumByInstituteIdAndDateRange(Long instituteId, LocalDate from, LocalDate to);

    BigDecimal sumByAdmissionId(Long admissionId);

    long countByInstituteIdAndDate(Long instituteId, LocalDate date);

    long countOverdueAdmissions(Long instituteId);

    BigDecimal totalOutstanding(Long instituteId);

    /**
     * Returns admission-level fee rows for students in batches assigned to the given faculty user.
     * @param type  "pending" → only dues > 0; "collected" → only fully/partially paid; null/blank → all
     */
    List<com.akt.institute.fees.dto.FacultyAdmissionFeeRow> findFacultyAdmissions(
            Long instituteId, Long facultyUserId, String type, int page, int size);

    long countFacultyAdmissions(Long instituteId, Long facultyUserId, String type);

    /**
     * Returns admission-level fee row for a specific student, validated against faculty's batch assignment.
     * Returns empty list if student is not in any of the faculty's assigned batches.
     */
    List<com.akt.institute.fees.dto.FacultyAdmissionFeeRow> findFacultyStudentAdmissions(
            Long instituteId, Long facultyUserId, Long studentId);
}
