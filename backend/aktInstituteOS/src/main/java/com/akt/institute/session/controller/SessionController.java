package com.akt.institute.session.controller;

import com.akt.institute.session.dto.UserSessionResponse;
import com.akt.institute.session.service.SessionService;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
@Tag(name = "Sessions", description = "Active session tracking and force-logout")
@SecurityRequirement(name = "bearerAuth")
public class SessionController {

    private final SessionService sessionService;

    @GetMapping("/me")
    @Operation(summary = "List all active sessions for the current user")
    public ResponseEntity<ApiResponse<List<UserSessionResponse>>> mySessions(
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest http) {
        // The current token hash helps identify the "current" session in the list
        String authHeader = http.getHeader("Authorization");
        String tokenHash  = (authHeader != null && authHeader.startsWith("Bearer "))
                ? String.valueOf(authHeader.substring(7).hashCode()) : null;
        return ResponseEntity.ok(ApiResponse.ok(sessionService.getMySessions(principal.getId(), tokenHash)));
    }

    @DeleteMapping("/me/{sessionId}")
    @Operation(summary = "Revoke a specific session (force logout from that device)")
    public ResponseEntity<ApiResponse<Void>> revokeMySession(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest http) {
        sessionService.revokeSession(sessionId, principal.getId(),
                principal.getInstituteId(), principal.getId(), ip(http), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.message("Session revoked"));
    }

    @DeleteMapping("/me")
    @Operation(summary = "Revoke all sessions — logout from all devices")
    public ResponseEntity<ApiResponse<Void>> revokeAllMySessions(
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest http) {
        sessionService.revokeAllSessions(principal.getId(), principal.getInstituteId(),
                principal.getId(), ip(http), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.message("All sessions revoked. Please log in again."));
    }

    @DeleteMapping("/users/{userId}")
    @PreAuthorize("hasAuthority('SESSION_REVOKE')")
    @Operation(summary = "Admin: force logout all sessions for a specific user")
    public ResponseEntity<ApiResponse<Void>> revokeUserSessions(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest http) {
        sessionService.revokeAllSessions(userId, principal.getInstituteId(),
                principal.getId(), ip(http), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.message("All sessions for user " + userId + " revoked"));
    }

    private String ip(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isBlank()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
