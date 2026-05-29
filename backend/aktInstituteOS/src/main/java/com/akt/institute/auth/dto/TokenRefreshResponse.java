package com.akt.institute.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TokenRefreshResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private long expiresIn; // seconds

    public TokenRefreshResponse(String accessToken, long expiresIn) {
        this.accessToken = accessToken;
        this.expiresIn = expiresIn;
    }
}
