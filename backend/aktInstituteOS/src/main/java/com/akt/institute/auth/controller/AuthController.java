package com.akt.institute.auth.controller;

import com.akt.institute.auth.dto.*;
import com.akt.institute.auth.service.AuthService;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Login, token refresh, logout, password management")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Login with email/username and password")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
        @Valid @RequestBody LoginRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse httpResponse
    ) {
        LoginResponse response = authService.login(request, httpRequest, httpResponse);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", response));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token using httpOnly cookie refresh token")
    public ResponseEntity<ApiResponse<TokenRefreshResponse>> refresh(
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        TokenRefreshResponse refreshResponse = authService.refresh(request, response);
        return ResponseEntity.ok(ApiResponse.ok("Token refreshed", refreshResponse));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout and revoke refresh token")
    public ResponseEntity<ApiResponse<Void>> logout(
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        authService.logout(request, response);
        return ResponseEntity.ok(ApiResponse.message("Logged out successfully"));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change password for authenticated user", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> changePassword(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody ChangePasswordRequest request
    ) {
        authService.changePassword(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.message("Password changed successfully. Please log in again."));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<LoginResponse.UserInfo>> me(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        var profile = authService.getProfile(principal.getId());
        var full = LoginResponse.UserInfo.builder()
            .id(profile.getId())
            .email(profile.getEmail())
            .username(profile.getUsername())
            .firstName(profile.getFirstName())
            .lastName(profile.getLastName())
            .fullName(profile.getFullName())
            .avatarUrl(profile.getAvatarUrl())
            .instituteId(principal.getInstituteId())
            .roles(principal.getRoleNames())
            .permissions(principal.getPermissions())
            .build();
        return ResponseEntity.ok(ApiResponse.ok(full));
    }

    @PutMapping("/me")
    @Operation(summary = "Update current user profile (name, phone)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<LoginResponse.UserInfo>> updateProfile(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody UpdateProfileRequest request
    ) {
        var updated = authService.updateProfile(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Profile updated successfully", updated));
    }
}
