package com.akt.institute.auth.domain;

import com.akt.institute.shared.domain.BaseEntity;
import lombok.*;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    private String uuid;
    private Long instituteId;
    private String username;
    private String email;
    private String passwordHash;
    private String firstName;
    private String lastName;
    private String phone;
    private String avatarUrl;
    @Builder.Default
    private boolean isActive = true;
    @Builder.Default
    private boolean isEmailVerified = false;
    private Instant lastLoginAt;
    private Instant passwordChangedAt;
    @Builder.Default
    private int failedLoginAttempts = 0;
    private Instant lockedUntil;
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    public String getFullName() {
        return (lastName != null && !lastName.isBlank())
            ? firstName + " " + lastName
            : firstName;
    }

    public boolean isLocked() {
        return lockedUntil != null && lockedUntil.isAfter(Instant.now());
    }

    public void incrementFailedAttempts() {
        this.failedLoginAttempts++;
    }

    public void resetFailedAttempts() {
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
    }

    public void lockFor(long minutes) {
        this.lockedUntil = Instant.now().plusSeconds(minutes * 60);
    }
}
