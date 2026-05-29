package com.akt.institute.expense.service;

import com.akt.institute.expense.domain.Expense;
import com.akt.institute.expense.dto.CreateExpenseRequest;
import com.akt.institute.expense.dto.ExpenseResponse;
import com.akt.institute.expense.repository.ExpenseDao;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.dto.PageMeta;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import com.akt.institute.shared.util.SequenceGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseDao expenseDao;
    private final SequenceGenerator sequenceGenerator;

    private static final String EXP = SequenceGenerator.EXPENSE;

    @Transactional
    public ExpenseResponse create(CreateExpenseRequest req, Long instituteId) {
        Expense e = new Expense();
        e.setUuid(UUID.randomUUID().toString());
        e.setExpenseNumber(sequenceGenerator.next(instituteId, EXP));
        e.setInstituteId(instituteId);
        e.setCategory(req.getCategory().toUpperCase());
        e.setDescription(req.getDescription());
        e.setAmount(req.getAmount());
        e.setExpenseDate(req.getExpenseDate() != null ? LocalDate.parse(req.getExpenseDate()) : LocalDate.now());
        e.setPaidTo(req.getPaidTo());
        e.setPaymentMode(req.getPaymentMode() != null ? req.getPaymentMode().toUpperCase() : "CASH");
        e.setReferenceNumber(req.getReferenceNumber());
        e.setNotes(req.getNotes());
        return toResponse(expenseDao.save(e));
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<ExpenseResponse>> list(Long instituteId, String category,
                                                    String from, String to, String q,
                                                    int page, int size, String sort, String dir) {
        LocalDate f = from != null && !from.isBlank() ? LocalDate.parse(from) : null;
        LocalDate t = to   != null && !to.isBlank()   ? LocalDate.parse(to)   : null;
        size = Math.min(size, 100);
        List<Expense> rows  = expenseDao.findWithFilters(instituteId, category, f, t, q, page, size, sort, dir);
        long total          = expenseDao.countWithFilters(instituteId, category, f, t, q);
        int totalPages      = total == 0 ? 0 : (int) Math.ceil((double) total / size);
        return ApiResponse.paged(rows.stream().map(this::toResponse).toList(),
            PageMeta.builder().page(page).size(size).total(total).totalPages(totalPages)
                .hasNext((long)(page+1)*size < total).hasPrevious(page > 0).build());
    }

    @Transactional
    public void delete(Long id, Long instituteId) {
        Expense e = expenseDao.findByIdAndInstituteId(id, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Expense", id));
        e.setDeletedAt(Instant.now());
        expenseDao.save(e);
    }

    private ExpenseResponse toResponse(Expense e) {
        ExpenseResponse r = new ExpenseResponse();
        r.setId(e.getId());
        r.setExpenseNumber(e.getExpenseNumber());
        r.setCategory(e.getCategory());
        r.setDescription(e.getDescription());
        r.setAmount(e.getAmount());
        r.setExpenseDate(e.getExpenseDate() != null ? e.getExpenseDate().toString() : null);
        r.setPaidTo(e.getPaidTo());
        r.setPaymentMode(e.getPaymentMode());
        r.setReferenceNumber(e.getReferenceNumber());
        r.setNotes(e.getNotes());
        r.setCreatedByName(e.getCreatedByName());
        if (e.getCreatedAt() != null) r.setCreatedAt(e.getCreatedAt().toString());
        return r;
    }
}
