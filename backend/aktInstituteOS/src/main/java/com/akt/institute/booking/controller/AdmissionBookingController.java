package com.akt.institute.booking.controller;

import com.akt.institute.booking.dto.BookingResponse;
import com.akt.institute.booking.dto.CreateBookingRequest;
import com.akt.institute.booking.service.AdmissionBookingService;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
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
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Admission Bookings", description = "Booking initiation, payment proof, verification, and cancellation")
@SecurityRequirement(name = "bearerAuth")
public class AdmissionBookingController {

    private final AdmissionBookingService bookingService;

    @PostMapping("/leads/{leadId}/booking")
    @PreAuthorize("hasAuthority('BOOKING_CREATE')")
    @Operation(summary = "Initiate admission booking for a lead — bookingType: REMOTE_TOKEN or ADMISSION_CLOSING")
    public ResponseEntity<ApiResponse<BookingResponse>> create(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long leadId,
        @Valid @RequestBody CreateBookingRequest request
    ) {
        boolean hasAssignPermission = principal.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("LEAD_ASSIGN"));
        var result = bookingService.create(leadId, principal.getInstituteId(), principal.getId(), hasAssignPermission, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created("Booking created", result));
    }

    @PatchMapping("/bookings/{id}/payment-proof")
    @PreAuthorize("hasAuthority('BOOKING_CREATE')")
    @Operation(summary = "Upload payment proof URL for a booking")
    public ResponseEntity<ApiResponse<BookingResponse>> uploadProof(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @RequestParam String proofUrl
    ) {
        var result = bookingService.uploadPaymentProof(id, principal.getInstituteId(), proofUrl, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Payment proof uploaded", result));
    }

    @PatchMapping("/bookings/{id}/verify")
    @PreAuthorize("hasAuthority('BOOKING_VERIFY')")
    @Operation(summary = "Verify payment and confirm booking — atomically deducts one seat (Admin)")
    public ResponseEntity<ApiResponse<BookingResponse>> verify(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        var result = bookingService.verifyPayment(id, principal.getInstituteId(), principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Booking confirmed", result));
    }

    @PatchMapping("/bookings/{id}/cancel")
    @PreAuthorize("hasAuthority('BOOKING_VERIFY')")
    @Operation(summary = "Cancel a booking — restores seat if already confirmed (Admin/Counsellor)")
    public ResponseEntity<ApiResponse<BookingResponse>> cancel(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @RequestParam(required = false) String reason
    ) {
        var result = bookingService.cancelBooking(id, principal.getInstituteId(), principal.getId(), reason);
        return ResponseEntity.ok(ApiResponse.ok("Booking cancelled", result));
    }

    @GetMapping("/leads/{leadId}/booking")
    @PreAuthorize("hasAuthority('BOOKING_VIEW')")
    @Operation(summary = "Get the active booking for a lead")
    public ResponseEntity<ApiResponse<BookingResponse>> getByLead(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long leadId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getByLead(leadId, principal.getInstituteId())));
    }

    @GetMapping("/leads/{leadId}/bookings/history")
    @PreAuthorize("hasAuthority('BOOKING_VIEW')")
    @Operation(summary = "Get full booking history for a lead — includes cancelled bookings")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> bookingHistory(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long leadId
    ) {
        return ResponseEntity.ok(
            ApiResponse.ok(bookingService.getAllByLead(leadId, principal.getInstituteId())));
    }

    @GetMapping("/bookings")
    @PreAuthorize("hasAuthority('BOOKING_VIEW')")
    @Operation(summary = "List all active bookings — optionally filter by status (Admin)")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> list(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        size = Math.min(size, 100);
        return ResponseEntity.ok(bookingService.list(principal.getInstituteId(), status, page, size));
    }
}
