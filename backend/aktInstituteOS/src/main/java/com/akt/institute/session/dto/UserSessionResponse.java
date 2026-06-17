package com.akt.institute.session.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data @Builder
public class UserSessionResponse {
    private Long    id;
    private String  uuid;
    private String  deviceName;
    private String  deviceType;
    private String  browser;
    private String  os;
    private String  ipAddress;
    private boolean active;
    private boolean current;    // true if this is the caller's own active session
    private Instant lastActiveAt;
    private Instant expiresAt;
    private Instant createdAt;
}
