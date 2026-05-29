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
}
