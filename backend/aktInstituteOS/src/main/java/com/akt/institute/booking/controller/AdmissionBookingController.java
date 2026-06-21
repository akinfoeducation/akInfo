package com.akt.institute.booking.controller;

import com.akt.institute.booking.dto.BookingResponse;
import com.akt.institute.booking.dto.CreateBookingRequest;
import com.akt.institute.booking.service.AdmissionBookingService;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import com.akt.institute.shared.storage.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Admission Bookings", description = "Booking initiation, payment proof, verification, and cancellation")
@SecurityRequirement(name = "bearerAuth")
public class AdmissionBookingController {

    private final AdmissionBookingService bookingService;
    private final FileStorageService fileStorageService;

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

    @PostMapping(value = "/bookings/{id}/payment-proof-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('BOOKING_CREATE')")
    @Operation(summary = "Upload a payment proof file (image/PDF) for a booking — stored and linked to the booking")
    public ResponseEntity<ApiResponse<BookingResponse>> uploadProofFile(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @RequestParam("file") MultipartFile file
    ) {
        // Stored under the PRIVATE tree — served only via the authenticated download endpoint below.
        var stored = fileStorageService.storePrivate(file, "bookings/proofs");
        var result = bookingService.uploadPaymentProof(id, principal.getInstituteId(), stored.url(), principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Payment proof uploaded", result));
    }

    @GetMapping("/bookings/{id}/payment-proof-file")
    @PreAuthorize("hasAuthority('BOOKING_VIEW')")
    @Operation(summary = "Download a booking's payment proof file — authenticated, tenant-scoped")
    public ResponseEntity<Resource> downloadProofFile(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        String key = bookingService.getProofKeyForDownload(id, principal.getInstituteId());
        var loaded = fileStorageService.loadPrivate(key);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(loaded.contentType()))
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + loaded.filename() + "\"")
            .body(loaded.resource());
    }

    @PatchMapping("/bookings/{id}/verify")
    @PreAuthorize("hasAuthority('BOOKING_VERIFY')")
    @Operation(summary = "Verify payment and confirm booking — Accountant/Admin only; deducts one seat")
    public ResponseEntity<ApiResponse<BookingResponse>> verify(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        // Defense in depth (C6): even if a COUNSELLOR were ever granted BOOKING_VERIFY by mistake,
        // they must never verify a payment. The role check makes the rule permission-drift-proof.
        var result = bookingService.verifyPayment(
            id, principal.getInstituteId(), principal.getId(), principal.hasRole("COUNSELLOR"));
        return ResponseEntity.ok(ApiResponse.ok("Booking confirmed", result));
    }

    @PatchMapping("/bookings/{id}/cancel")
    @PreAuthorize("hasAuthority('BOOKING_CANCEL')")
    @Operation(summary = "Cancel a booking — counsellors may cancel PAYMENT_PENDING only; "
        + "cancelling a BOOKING_CONFIRMED booking (financial reversal) is Accountant/Admin only")
    public ResponseEntity<ApiResponse<BookingResponse>> cancel(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @RequestParam(required = false) String reason
    ) {
        // Only holders of BOOKING_VERIFY (Accountant/Institute Admin/Super Admin) may cancel a
        // CONFIRMED booking — it reverses a verified payment and restores a seat (C6).
        boolean canCancelConfirmed = principal.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("BOOKING_VERIFY"));
        var result = bookingService.cancelBooking(
            id, principal.getInstituteId(), principal.getId(), reason, canCancelConfirmed);
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
