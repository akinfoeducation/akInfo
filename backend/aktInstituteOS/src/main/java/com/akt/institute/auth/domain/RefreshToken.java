package com.akt.institute.auth.domain;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    private Long id;
    private User user;
    private String tokenHash;
    private Instant expiresAt;
    @Builder.Default
    private boolean isRevoked = false;
    private Instant revokedAt;
    private String revokeReason;
    private String ipAddress;
    private String userAgent;
    private Instant createdAt;

    public boolean isExpired() {
        return expiresAt.isBefore(Instant.now());
    }

    public boolean isValid() {
        return !isRevoked && !isExpired();
    }

    public void revoke(String reason) {
        this.isRevoked = true;
        this.revokedAt = Instant.now();
        this.revokeReason = reason;
    }
}
