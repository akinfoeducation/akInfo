package com.akt.institute.expense.controller;

import com.akt.institute.expense.dto.CreateExpenseRequest;
import com.akt.institute.expense.dto.ExpenseResponse;
import com.akt.institute.expense.service.ExpenseService;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/expenses")
@RequiredArgsConstructor
@Tag(name = "Expenses")
@SecurityRequirement(name = "bearerAuth")
public class ExpenseController {

    private final ExpenseService expenseService;

    @GetMapping
    @PreAuthorize("hasAuthority('EXPENSE_VIEW')")
    public ResponseEntity<ApiResponse<List<ExpenseResponse>>> list(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "expense_date") String sort,
        @RequestParam(defaultValue = "desc") String dir
    ) {
        return ResponseEntity.ok(
            expenseService.list(principal.getInstituteId(), category, from, to, q, page, size, sort, dir));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('EXPENSE_CREATE')")
    public ResponseEntity<ApiResponse<ExpenseResponse>> create(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CreateExpenseRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created("Expense recorded", expenseService.create(request, principal.getInstituteId())));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('EXPENSE_DELETE')")
    public ResponseEntity<ApiResponse<Void>> delete(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        expenseService.delete(id, principal.getInstituteId());
        return ResponseEntity.ok(ApiResponse.message("Expense deleted"));
    }
}
