package com.akt.institute.fees.service;

import com.akt.institute.admission.repository.AdmissionDao;
import com.akt.institute.fees.domain.FeePayment;
import com.akt.institute.fees.domain.PaymentMode;
import com.akt.institute.fees.dto.CreateFeePaymentRequest;
import com.akt.institute.fees.dto.FeePaymentResponse;
import com.akt.institute.fees.dto.FeesSummaryResponse;
import com.akt.institute.fees.mapper.FeePaymentMapper;
import com.akt.institute.fees.repository.FeePaymentDao;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.dto.PageMeta;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import com.akt.institute.shared.util.SequenceGenerator;
import com.akt.institute.notification.event.FeePaymentNotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeePaymentService {

    private final FeePaymentDao feePaymentDao;
    private final AdmissionDao admissionDao;
    private final FeePaymentMapper mapper;
    private final SequenceGenerator sequenceGenerator;
    private final ApplicationEventPublisher eventPublisher;

    // ── Collect payment ──────────────────────────────────────────────────────

    @Transactional
    public FeePaymentResponse collect(CreateFeePaymentRequest request, Long instituteId) {
        var admission = admissionDao.findByIdAndInstituteId(request.getAdmissionId(), instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Admission", request.getAdmissionId()));

        if (admission.getStatus().name().equals("CANCELLED")) {
            throw new BusinessException("Cannot collect fees for a cancelled admission",
                "ADMISSION_CANCELLED", HttpStatus.BAD_REQUEST);
        }

        // Validate overpayment
        BigDecimal newTotal = feePaymentDao.sumByAdmissionId(admission.getId()).add(request.getAmount());
        if (newTotal.compareTo(admission.getFeesAgreed()) > 0 && admission.getFeesAgreed().compareTo(BigDecimal.ZERO) > 0) {
            throw new BusinessException(
                "Payment would exceed fees agreed (₹" + admission.getFeesAgreed() + "). Already paid: ₹" +
                feePaymentDao.sumByAdmissionId(admission.getId()),
                "OVERPAYMENT", HttpStatus.BAD_REQUEST);
        }

        FeePayment payment = FeePayment.builder()
            .uuid(UUID.randomUUID().toString())
            .receiptNumber(sequenceGenerator.next(instituteId, SequenceGenerator.RECEIPT))
            .instituteId(instituteId)
            .admissionId(admission.getId())
            .amount(request.getAmount())
            .paymentDate(request.getPaymentDate() != null ? request.getPaymentDate() : LocalDate.now())
            .paymentMode(parseMode(request.getPaymentMode()))
            .referenceNumber(request.getReferenceNumber())
            .notes(request.getNotes())
            .build();

        FeePayment saved = feePaymentDao.save(payment);

        // Update fees_paid on the admission
        BigDecimal totalPaid = feePaymentDao.sumByAdmissionId(admission.getId());
        admission.setFeesPaid(totalPaid);
        admissionDao.save(admission);

        log.info("Fee collected: receipt={}, admissionId={}, amount={}", saved.getReceiptNumber(), saved.getAdmissionId(), saved.getAmount());

        // Publish notification event (async, non-blocking)
        try {
            BigDecimal balance = admission.getFeesAgreed().subtract(totalPaid);
            eventPublisher.publishEvent(new FeePaymentNotificationEvent(
                this, instituteId, saved.getId(),
                admission.getFullName(), admission.getPhone(), admission.getEmail(),
                saved.getReceiptNumber(), saved.getAmount(),
                balance.max(BigDecimal.ZERO),
                saved.getPaymentDate(), saved.getPaymentMode().name()
            ));
        } catch (Exception ex) {
            log.warn("Failed to publish fee payment notification event: {}", ex.getMessage());
        }

        // Set denormalized fields for response
        saved.setAdmissionNumber(admission.getAdmissionNumber());
        saved.setStudentName(admission.getFullName());
        saved.setCourseName(admission.getCourseName());

        return mapper.toResponse(saved);
    }

    // ── List ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ApiResponse<List<FeePaymentResponse>> list(
        Long instituteId, Long admissionId, String paymentMode,
        LocalDate from, LocalDate to, int page, int size
    ) {
        List<FeePayment> payments = feePaymentDao.findWithFilters(
            instituteId, admissionId, paymentMode, from, to, page, size);
        long total = feePaymentDao.countWithFilters(instituteId, admissionId, paymentMode, from, to);
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / size);

        return ApiResponse.paged(
            mapper.toResponseList(payments),
            PageMeta.builder()
                .page(page).size(size).total(total).totalPages(totalPages)
                .hasNext((long) (page + 1) * size < total)
                .hasPrevious(page > 0)
                .build()
        );
    }

    // ── Summary ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public FeesSummaryResponse summary(Long instituteId) {
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate yearStart  = today.withDayOfYear(1);

        return FeesSummaryResponse.builder()
            .collectedToday(feePaymentDao.sumByInstituteIdAndDateRange(instituteId, today, today))
            .collectedThisMonth(feePaymentDao.sumByInstituteIdAndDateRange(instituteId, monthStart, today))
            .collectedThisYear(feePaymentDao.sumByInstituteIdAndDateRange(instituteId, yearStart, today))
            .totalOutstanding(feePaymentDao.totalOutstanding(instituteId))
            .overdueCount(feePaymentDao.countOverdueAdmissions(instituteId))
            .paymentsToday(feePaymentDao.countByInstituteIdAndDate(instituteId, today))
            .build();
    }

    // ── Cancel payment ───────────────────────────────────────────────────────

    @Transactional
    public void cancel(Long id, Long instituteId) {
        FeePayment payment = feePaymentDao.findByIdAndInstituteId(id, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("FeePayment", id));

        payment.setDeletedAt(Instant.now());
        feePaymentDao.save(payment);

        // Recalculate fees_paid on the admission
        admissionDao.findByIdAndInstituteId(payment.getAdmissionId(), instituteId)
            .ifPresent(admission -> {
                admission.setFeesPaid(feePaymentDao.sumByAdmissionId(admission.getId()));
                admissionDao.save(admission);
            });

        log.info("Fee payment cancelled: receipt={}", payment.getReceiptNumber());
    }

    // ── Internals ────────────────────────────────────────────────────────────

    private static PaymentMode parseMode(String value) {
        if (value == null || value.isBlank()) return PaymentMode.CASH;
        try {
            return PaymentMode.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(
                "Invalid payment mode '" + value + "'. Valid: " + Arrays.toString(PaymentMode.values()),
                "INVALID_PAYMENT_MODE", HttpStatus.BAD_REQUEST);
        }
    }
}
