package com.akt.institute.auth.repository;

import com.akt.institute.auth.domain.RefreshToken;
import com.akt.institute.auth.domain.User;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenDao {

    RefreshToken save(RefreshToken token);

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    void revokeAllByUser(User user, Instant now, String reason);

    void deleteExpiredAndRevoked(Instant now);
}
