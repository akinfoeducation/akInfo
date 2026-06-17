package com.akt.institute.session.domain;

import lombok.*;
import java.time.Instant;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserSession {
    private Long    id;
    private String  uuid;
    private Long    userId;
    private Long    instituteId;
    private String  tokenHash;
    private String  deviceName;
    private String  deviceType;
    private String  browser;
    private String  os;
    private String  ipAddress;
    private boolean active;
    private Instant lastActiveAt;
    private Instant expiresAt;
    private Instant createdAt;
}
