package com.akt.institute.auth.service;

import com.akt.institute.auth.domain.RefreshToken;
import com.akt.institute.auth.domain.User;
import com.akt.institute.auth.repository.RefreshTokenDao;
import com.akt.institute.shared.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenDao refreshTokenDao;

    @Value("${app.jwt.refresh-token-expiry-days}")
    private int refreshTokenExpiryDays;

    @Transactional
    public String createRefreshToken(User user, String ipAddress, String userAgent) {
        String rawToken = UUID.randomUUID() + UUID.randomUUID().toString();
        String tokenHash = hashToken(rawToken);

        var refreshToken = RefreshToken.builder()
            .user(user)
            .tokenHash(tokenHash)
            .expiresAt(Instant.now().plusSeconds((long) refreshTokenExpiryDays * 24 * 3600))
            .ipAddress(ipAddress)
            .userAgent(truncate(userAgent, 500))
            .build();

        refreshTokenDao.save(refreshToken);
        return rawToken;
    }

    @Transactional
    public RefreshToken validateAndRotate(String rawToken, String ipAddress, String userAgent) {
        String tokenHash = hashToken(rawToken);

        var existing = refreshTokenDao.findByTokenHash(tokenHash)
            .orElseThrow(() -> new BusinessException("Invalid refresh token", "INVALID_REFRESH_TOKEN", HttpStatus.UNAUTHORIZED));

        if (!existing.isValid()) {
            if (existing.isRevoked()) {
                refreshTokenDao.revokeAllByUser(existing.getUser(), Instant.now(), "POTENTIAL_THEFT");
            }
            throw new BusinessException("Refresh token expired or revoked", "REFRESH_TOKEN_INVALID", HttpStatus.UNAUTHORIZED);
        }

        existing.revoke("ROTATED");
        refreshTokenDao.save(existing);

        return existing;
    }

    @Transactional
    public void revokeAllForUser(User user) {
        refreshTokenDao.revokeAllByUser(user, Instant.now(), "LOGOUT");
    }

    public int getRefreshTokenExpiryDays() {
        return refreshTokenExpiryDays;
    }

    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupExpiredTokens() {
        refreshTokenDao.deleteExpiredAndRevoked(Instant.now());
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private String truncate(String value, int maxLength) {
        if (value == null) return null;
        return value.length() > maxLength ? value.substring(0, maxLength) : value;
    }
}
