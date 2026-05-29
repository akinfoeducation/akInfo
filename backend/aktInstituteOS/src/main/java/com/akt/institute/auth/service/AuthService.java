package com.akt.institute.auth.service;

import com.akt.institute.auth.domain.User;
import com.akt.institute.auth.dto.*;
import com.akt.institute.auth.repository.UserDao;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.security.JwtService;
import com.akt.institute.shared.security.UserPrincipal;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Arrays;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserDao userDao;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.institute.default-id:1}")
    private Long defaultInstituteId;

    @Value("${app.jwt.access-token-expiry-ms}")
    private long accessTokenExpiryMs;

    /** false in dev (HTTP), true in prod (HTTPS). Controls the Secure flag on the refresh cookie. */
    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCK_DURATION_MINUTES = 15;

    @Transactional
    public LoginResponse login(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        var user = userDao.findByEmailOrUsernameAndInstituteId(
            request.getEmailOrUsername(), defaultInstituteId
        ).orElseThrow(() -> new BusinessException("Invalid email or password", "INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED));

        if (user.isLocked()) {
            throw new BusinessException(
                "Account is temporarily locked. Please try again later.", "ACCOUNT_LOCKED", HttpStatus.UNAUTHORIZED);
        }

        if (!user.isActive()) {
            throw new BusinessException(
                "Account is inactive. Please contact administrator.", "ACCOUNT_DISABLED", HttpStatus.UNAUTHORIZED);
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            handleFailedAttempt(user);
            throw new BusinessException("Invalid email or password", "INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED);
        }

        user.resetFailedAttempts();
        user.setLastLoginAt(Instant.now());
        userDao.save(user);

        var principal = new UserPrincipal(user);
        String accessToken = jwtService.generateAccessToken(principal);
        String rawRefreshToken = refreshTokenService.createRefreshToken(
            user,
            getClientIp(httpRequest),
            httpRequest.getHeader("User-Agent")
        );

        setRefreshTokenCookie(httpResponse, rawRefreshToken);

        log.info("User logged in: userId={}, email={}", user.getId(), user.getEmail());

        return buildLoginResponse(user, principal, accessToken);
    }

    @Transactional
    public TokenRefreshResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        String rawToken = extractRefreshTokenFromCookie(request);
        if (rawToken == null) {
            throw new BusinessException("Refresh token not found", "MISSING_REFRESH_TOKEN", HttpStatus.UNAUTHORIZED);
        }

        var existingToken = refreshTokenService.validateAndRotate(
            rawToken,
            getClientIp(request),
            request.getHeader("User-Agent")
        );

        var user = existingToken.getUser();
        var principal = new UserPrincipal(user);
        String newAccessToken = jwtService.generateAccessToken(principal);
        String newRawRefreshToken = refreshTokenService.createRefreshToken(
            user,
            getClientIp(request),
            request.getHeader("User-Agent")
        );

        setRefreshTokenCookie(response, newRawRefreshToken);

        return new TokenRefreshResponse(newAccessToken, accessTokenExpiryMs / 1000);
    }

    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String rawToken = extractRefreshTokenFromCookie(request);
        if (rawToken != null) {
            try {
                var existingToken = refreshTokenService.validateAndRotate(rawToken, null, null);
                refreshTokenService.revokeAllForUser(existingToken.getUser());
            } catch (Exception e) {
                log.debug("Error revoking token on logout: {}", e.getMessage());
            }
        }
        clearRefreshTokenCookie(response);
    }

    @Transactional(readOnly = true)
    public LoginResponse.UserInfo getProfile(Long userId) {
        var user = userDao.findById(userId)
            .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));
        return LoginResponse.UserInfo.builder()
            .id(user.getId())
            .email(user.getEmail())
            .username(user.getUsername())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .fullName(user.getFullName())
            .avatarUrl(user.getAvatarUrl())
            .instituteId(user.getInstituteId())
            .build();
    }

    @Transactional
    public LoginResponse.UserInfo updateProfile(Long userId, UpdateProfileRequest request) {
        var user = userDao.findById(userId)
            .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName() != null ? request.getLastName().trim() : null);
        user.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        var saved = userDao.save(user);
        return LoginResponse.UserInfo.builder()
            .id(saved.getId())
            .email(saved.getEmail())
            .username(saved.getUsername())
            .firstName(saved.getFirstName())
            .lastName(saved.getLastName())
            .fullName(saved.getFullName())
            .avatarUrl(saved.getAvatarUrl())
            .instituteId(saved.getInstituteId())
            .build();
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        var user = userDao.findById(userId)
            .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Current password is incorrect", "INVALID_PASSWORD", HttpStatus.BAD_REQUEST);
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(Instant.now());
        userDao.save(user);

        refreshTokenService.revokeAllForUser(user);
    }

    private void handleFailedAttempt(User user) {
        user.incrementFailedAttempts();
        if (user.getFailedLoginAttempts() >= MAX_FAILED_ATTEMPTS) {
            user.lockFor(LOCK_DURATION_MINUTES);
            log.warn("Account locked due to failed attempts: userId={}", user.getId());
        }
        userDao.save(user);
    }

    private LoginResponse buildLoginResponse(User user, UserPrincipal principal, String accessToken) {
        var userInfo = LoginResponse.UserInfo.builder()
            .id(user.getId())
            .email(user.getEmail())
            .username(user.getUsername())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .fullName(user.getFullName())
            .avatarUrl(user.getAvatarUrl())
            .instituteId(user.getInstituteId())
            .roles(principal.getRoleNames())
            .permissions(principal.getPermissions())
            .build();

        return LoginResponse.builder()
            .accessToken(accessToken)
            .expiresIn(accessTokenExpiryMs / 1000)
            .user(userInfo)
            .build();
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String token) {
        var cookie = new Cookie("refresh_token", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);   // false on HTTP dev, true on HTTPS prod
        cookie.setPath("/api/v1/auth");
        cookie.setMaxAge((int) (refreshTokenService.getRefreshTokenExpiryDays() * 24 * 3600));
        response.addCookie(cookie);
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        var cookie = new Cookie("refresh_token", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/api/v1/auth");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
            .filter(c -> "refresh_token".equals(c.getName()))
            .map(Cookie::getValue)
            .findFirst()
            .orElse(null);
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
