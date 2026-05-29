package com.akt.institute.expense.repository;

import com.akt.institute.expense.domain.Expense;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ExpenseDao {
    Expense save(Expense expense);
    Optional<Expense> findByIdAndInstituteId(Long id, Long instituteId);
    List<Expense> findWithFilters(Long instituteId, String category, LocalDate from, LocalDate to,
                                   String q, int page, int size, String sort, String dir);
    long countWithFilters(Long instituteId, String category, LocalDate from, LocalDate to, String q);
    BigDecimal sumByInstituteAndDateRange(Long instituteId, LocalDate from, LocalDate to);
}
