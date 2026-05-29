package com.akt.institute.notification.controller;

import com.akt.institute.notification.dto.*;
import com.akt.institute.notification.service.NotificationService;
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
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService service;

    // ── Notification Logs ─────────────────────────────────────────────────────

    @GetMapping("/logs")
    @PreAuthorize("hasAuthority('NOTIFICATION_VIEW')")
    @Operation(summary = "List notification logs with optional filters")
    public ResponseEntity<ApiResponse<List<NotificationLogResponse>>> logs(
        @AuthenticationPrincipal UserPrincipal p,
        @RequestParam(required = false) String channel,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(service.listLogs(p.getInstituteId(), channel, status, page, size));
    }

    // ── Templates ─────────────────────────────────────────────────────────────

    @GetMapping("/templates")
    @PreAuthorize("hasAuthority('NOTIFICATION_VIEW')")
    @Operation(summary = "List all notification templates")
    public ResponseEntity<ApiResponse<List<NotificationTemplateResponse>>> listTemplates(
        @AuthenticationPrincipal UserPrincipal p
    ) {
        return ResponseEntity.ok(ApiResponse.ok(service.listTemplates(p.getInstituteId())));
    }

    @PostMapping("/templates")
    @PreAuthorize("hasAuthority('NOTIFICATION_TEMPLATE')")
    @Operation(summary = "Create a notification template")
    public ResponseEntity<ApiResponse<NotificationTemplateResponse>> createTemplate(
        @AuthenticationPrincipal UserPrincipal p,
        @Valid @RequestBody SaveTemplateRequest request
    ) {
        var template = service.saveTemplate(request, p.getInstituteId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created("Template created", template));
    }

    @PutMapping("/templates/{id}")
    @PreAuthorize("hasAuthority('NOTIFICATION_TEMPLATE')")
    @Operation(summary = "Update a notification template")
    public ResponseEntity<ApiResponse<NotificationTemplateResponse>> updateTemplate(
        @AuthenticationPrincipal UserPrincipal p,
        @PathVariable Long id,
        @Valid @RequestBody SaveTemplateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Template updated",
            service.updateTemplate(id, request, p.getInstituteId())));
    }

    @DeleteMapping("/templates/{id}")
    @PreAuthorize("hasAuthority('NOTIFICATION_TEMPLATE')")
    @Operation(summary = "Delete (deactivate) a notification template")
    public ResponseEntity<ApiResponse<Void>> deleteTemplate(
        @AuthenticationPrincipal UserPrincipal p,
        @PathVariable Long id
    ) {
        service.deleteTemplate(id, p.getInstituteId());
        return ResponseEntity.ok(ApiResponse.message("Template deleted"));
    }

    // ── Manual Send ───────────────────────────────────────────────────────────

    @PostMapping("/send")
    @PreAuthorize("hasAuthority('NOTIFICATION_SEND')")
    @Operation(summary = "Send a single manual notification (queued async)")
    public ResponseEntity<ApiResponse<Void>> sendManual(
        @AuthenticationPrincipal UserPrincipal p,
        @Valid @RequestBody ManualSendRequest request
    ) {
        service.sendManual(request, p.getInstituteId());
        return ResponseEntity.accepted()
            .body(ApiResponse.message("Notification queued for delivery"));
    }

    // ── Broadcast ─────────────────────────────────────────────────────────────

    @PostMapping("/broadcast")
    @PreAuthorize("hasAuthority('NOTIFICATION_SEND')")
    @Operation(summary = "Send broadcast to filtered recipient list (queued async)")
    public ResponseEntity<ApiResponse<Void>> broadcast(
        @AuthenticationPrincipal UserPrincipal p,
        @Valid @RequestBody BroadcastRequest request
    ) {
        service.broadcast(request, p.getInstituteId());
        return ResponseEntity.accepted()
            .body(ApiResponse.message("Broadcast queued for delivery"));
    }
}
