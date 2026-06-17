package com.akt.institute.booking.repository;

import com.akt.institute.booking.domain.AdmissionBooking;

import java.util.List;
import java.util.Optional;

public interface AdmissionBookingDao {

    AdmissionBooking save(AdmissionBooking booking);

    Optional<AdmissionBooking> findByIdAndInstituteId(Long id, Long instituteId);

    /**
     * Returns the ACTIVE booking for a lead (is_active = true).
     * Use findAllByLeadId for history including cancelled bookings.
     */
    Optional<AdmissionBooking> findByLeadId(Long leadId, Long instituteId);

    /** Explicit active-only lookup — prefer this over findByLeadId for new code. */
    Optional<AdmissionBooking> findActiveByLeadId(Long leadId, Long instituteId);

    /** Full history including cancelled bookings (for audit trail). */
    List<AdmissionBooking> findAllByLeadId(Long leadId, Long instituteId);

    List<AdmissionBooking> findByInstituteId(Long instituteId, String status, int page, int size);

    long countByInstituteId(Long instituteId, String status);

    void updatePaymentProof(Long id, String proofUrl, Long updatedBy);

    boolean deductSeat(Long batchId);

    /** Restores one seat to the batch — used when a BOOKING_CONFIRMED booking is cancelled. */
    boolean restoreSeat(Long batchId);

    /** Atomically transitions booking from PAYMENT_PENDING → BOOKING_CONFIRMED. Returns false if already confirmed. */
    boolean confirmAtomically(Long bookingId, Long actorId);

    /**
     * Cancels a booking: sets is_active=false, booking_status=CANCELLED.
     * Returns true if the row was active and is now cancelled; false if already inactive.
     */
    boolean cancelBooking(Long bookingId, Long cancelledBy, String cancelReason);
}
