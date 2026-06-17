package com.akt.institute.booking.service;

import com.akt.institute.admission.repository.AdmissionDao;
import com.akt.institute.booking.domain.AdmissionBooking;
import com.akt.institute.booking.domain.BookingStatus;
import com.akt.institute.booking.dto.BookingResponse;
import com.akt.institute.booking.dto.CreateBookingRequest;
import com.akt.institute.booking.repository.AdmissionBookingDao;
import com.akt.institute.lead.activity.service.LeadActivityService;
import com.akt.institute.lead.domain.DeliveryMode;
import com.akt.institute.lead.domain.Lead;
import com.akt.institute.lead.domain.LeadStatus;
import com.akt.institute.lead.repository.LeadDao;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.dto.PageMeta;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import com.akt.institute.shared.util.AuditUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdmissionBookingService {

    private final AdmissionBookingDao bookingDao;
    private final LeadDao             leadDao;
    private final AdmissionDao        admissionDao;
    private final LeadActivityService activityService;

    @Transactional
    public BookingResponse create(Long leadId, Long instituteId, Long actorId,
                                  boolean hasAssignPermission, CreateBookingRequest request) {
        Lead lead = leadDao.findByIdAndInstituteId(leadId, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Lead", leadId));

        // Callers and counsellors can only book leads assigned to them
        if (!hasAssignPermission && !java.util.Objects.equals(lead.getAssignedToId(), actorId)) {
            throw new BusinessException(
                "You can only create bookings for leads assigned to you",
                "ACCESS_DENIED", HttpStatus.FORBIDDEN);
        }

        // Fix 3: check for active booking only — allows a second booking when previous one was cancelled
        if (bookingDao.findActiveByLeadId(leadId, instituteId).isPresent()) {
            throw new BusinessException(
                "An active booking already exists for this lead",
                "BOOKING_ALREADY_EXISTS", HttpStatus.CONFLICT);
        }

        // Resolve booking type — REMOTE_TOKEN for caller path, ADMISSION_CLOSING for counsellor path
        String bookingType = resolveBookingType(request.getBookingType());

        AdmissionBooking booking = AdmissionBooking.builder()
            .uuid(UUID.randomUUID().toString())
            .instituteId(instituteId)
            .leadId(leadId)
            .batchId(request.getBatchId())
            .paymentAmount(request.getPaymentAmount())
            .bookingStatus(BookingStatus.PAYMENT_PENDING)
            .bookingType(bookingType)
            .active(true)
            .notes(request.getNotes())
            .createdBy(actorId)
            .build();

        AdmissionBooking saved = bookingDao.save(booking);

        // Update lead status atomically within the same transaction
        lead.setStatus(LeadStatus.PAYMENT_PENDING);
        leadDao.save(lead);

        activityService.record(leadId, instituteId, "BOOKING_CREATED",
            "Booking created (type=" + bookingType + ", batch ID: " + request.getBatchId()
                + ") — awaiting payment", actorId);

        log.info("Booking created for lead {} batch {} type={} by actor {}",
            leadId, request.getBatchId(), bookingType, actorId);
        return toResponse(saved);
    }

    @Transactional
    public BookingResponse uploadPaymentProof(Long bookingId, Long instituteId, String proofUrl, Long actorId) {
        AdmissionBooking booking = findOrThrow(bookingId, instituteId);
        bookingDao.updatePaymentProof(bookingId, proofUrl, actorId);
        booking.setPaymentProofUrl(proofUrl);
        booking.setPaymentProofUploadedAt(Instant.now());

        activityService.record(booking.getLeadId(), instituteId, "PAYMENT_PROOF_UPLOADED",
            "Payment proof uploaded — awaiting verification", actorId);

        return toResponse(booking);
    }

    @Transactional
    public BookingResponse verifyPayment(Long bookingId, Long instituteId, Long actorId) {
        AdmissionBooking booking = findOrThrow(bookingId, instituteId);

        if (booking.getPaymentProofUrl() == null) {
            throw new BusinessException("Payment proof not uploaded yet", "NO_PAYMENT_PROOF", HttpStatus.BAD_REQUEST);
        }

        // Separation of duties: the person who created the booking cannot verify it.
        // Even though only ACCOUNTANT/Admin hold BOOKING_VERIFY, an admin may also hold
        // BOOKING_CREATE — this guard closes that self-verification loophole.
        if (java.util.Objects.equals(booking.getCreatedBy(), actorId)) {
            throw new BusinessException(
                "You cannot verify a booking you created. Payment verification must be done by a "
                    + "different person (separation of duties).",
                "SELF_VERIFY_DENIED", HttpStatus.FORBIDDEN);
        }

        // Step 1: Atomically confirm the booking (prevents double-confirm under concurrency)
        boolean confirmed = bookingDao.confirmAtomically(bookingId, actorId);
        if (!confirmed) {
            throw new BusinessException("Booking is already confirmed or in invalid state",
                "ALREADY_CONFIRMED", HttpStatus.CONFLICT);
        }

        // Step 2: Atomically deduct one seat (CAS update — only succeeds if seats > 0)
        boolean seatDeducted = bookingDao.deductSeat(booking.getBatchId());
        if (!seatDeducted) {
            // Transaction will roll back automatically since we throw here — confirmation is also rolled back
            throw new BusinessException("No available seats in this batch — booking rolled back",
                "BATCH_FULL", HttpStatus.CONFLICT);
        }

        // Step 3: Update lead status + stamp booking_confirmed_at — all within the same transaction
        leadDao.findByIdAndInstituteId(booking.getLeadId(), instituteId).ifPresent(lead -> {
            lead.setStatus(LeadStatus.BOOKING_CONFIRMED);
            lead.setConvertedAt(Instant.now());
            lead.setBookingConfirmedAt(Instant.now());
            leadDao.save(lead);

            // Step 4: ONLINE leads transfer ownership to counsellor automatically at BOOKING_CONFIRMED
            if (lead.getDeliveryMode() == DeliveryMode.ONLINE && lead.getCounsellorId() == null) {
                // Counsellor will be assigned separately via handoff endpoint — record the trigger event
                activityService.record(lead.getId(), instituteId, "BOOKING_CONFIRMED",
                    "Payment verified and seat reserved. ONLINE lead — ready for counsellor handoff.",
                    actorId);
            } else {
                activityService.record(lead.getId(), instituteId, "BOOKING_CONFIRMED",
                    "Payment verified and seat reserved (batch ID: " + booking.getBatchId() + ")",
                    actorId);
            }
        });

        AdmissionBooking saved = findOrThrow(bookingId, instituteId);
        log.info("Booking {} confirmed atomically, seat deducted from batch {}", bookingId, booking.getBatchId());
        return toResponse(saved);
    }

    // ── Cancel Booking ────────────────────────────────────────────────────────

    @Transactional
    public BookingResponse cancelBooking(Long bookingId, Long instituteId, Long actorId, String reason) {
        AdmissionBooking booking = findOrThrow(bookingId, instituteId);

        if (admissionDao.existsByLeadIdAndInstituteId(booking.getLeadId(), instituteId)) {
            throw new BusinessException(
                "Cannot cancel a booking after an admission has been created. Cancel the admission first.",
                "ADMISSION_EXISTS", HttpStatus.CONFLICT);
        }

        boolean cancelled = bookingDao.cancelBooking(bookingId, actorId, reason);
        if (!cancelled) {
            throw new BusinessException(
                "Booking is already cancelled or could not be found",
                "CANCEL_FAILED", HttpStatus.CONFLICT);
        }

        // If seat was already deducted (BOOKING_CONFIRMED), restore it
        if (booking.getBookingStatus() == BookingStatus.BOOKING_CONFIRMED) {
            bookingDao.restoreSeat(booking.getBatchId());
            log.info("Seat restored to batch {} after cancellation of confirmed booking {}",
                booking.getBatchId(), bookingId);
        }

        // Revert lead to ADMISSION_INTERESTED so counsellor/caller can restart
        leadDao.findByIdAndInstituteId(booking.getLeadId(), instituteId).ifPresent(lead -> {
            lead.setStatus(LeadStatus.ADMISSION_INTERESTED);
            lead.setBookingConfirmedAt(null);
            leadDao.save(lead);
        });

        activityService.record(booking.getLeadId(), instituteId, "BOOKING_CANCELLED",
            "Booking cancelled" + (reason != null && !reason.isBlank() ? ": " + reason : "")
                + " — lead reverted to ADMISSION_INTERESTED", actorId);

        log.info("Booking {} cancelled by actor {}, reason: {}", bookingId, actorId, reason);
        return toResponse(findOrThrow(bookingId, instituteId));
    }

    // ── Read ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public BookingResponse getByLead(Long leadId, Long instituteId) {
        return bookingDao.findActiveByLeadId(leadId, instituteId)
            .map(this::toResponse)
            .orElseThrow(() -> new ResourceNotFoundException("Active booking for lead", leadId));
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getAllByLead(Long leadId, Long instituteId) {
        return bookingDao.findAllByLeadId(leadId, instituteId)
            .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<BookingResponse>> list(Long instituteId, String status, int page, int size) {
        List<BookingResponse> items = bookingDao.findByInstituteId(instituteId, status, page, size)
            .stream().map(this::toResponse).toList();
        long total = bookingDao.countByInstituteId(instituteId, status);
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / size);
        return ApiResponse.paged(items, PageMeta.builder()
            .page(page).size(size).total(total).totalPages(totalPages)
            .hasNext((long) (page + 1) * size < total).hasPrevious(page > 0).build());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static String resolveBookingType(String requested) {
        if ("REMOTE_TOKEN".equalsIgnoreCase(requested)) return "REMOTE_TOKEN";
        return "ADMISSION_CLOSING"; // default for counsellor in-person path
    }

    private AdmissionBooking findOrThrow(Long id, Long instituteId) {
        return bookingDao.findByIdAndInstituteId(id, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Booking", id));
    }

    private BookingResponse toResponse(AdmissionBooking b) {
        return BookingResponse.builder()
            .id(b.getId())
            .uuid(b.getUuid())
            .leadId(b.getLeadId())
            .batchId(b.getBatchId())
            .paymentAmount(b.getPaymentAmount())
            .paymentProofUrl(b.getPaymentProofUrl())
            .paymentProofUploadedAt(b.getPaymentProofUploadedAt())
            .bookingStatus(b.getBookingStatus() != null ? b.getBookingStatus().name() : null)
            .paymentVerifiedBy(b.getPaymentVerifiedBy())
            .paymentVerifiedAt(b.getPaymentVerifiedAt())
            .notes(b.getNotes())
            .bookingType(b.getBookingType())
            .active(b.isActive())
            .cancelledAt(b.getCancelledAt())
            .createdAt(b.getCreatedAt())
            .updatedAt(b.getUpdatedAt())
            .leadName(b.getLeadName())
            .leadPhone(b.getLeadPhone())
            .build();
    }
}
