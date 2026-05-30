package com.akt.institute.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank(message = "Email or username is required")
    private String emailOrUsername;

    @NotBlank(message = "Password is required")
    private String password;

    /**
     * Subdomain sent by the frontend to identify the institute.
     * e.g. "delhi" from delhi.akinfoinstitute.tech
     * Null/blank on localhost dev — backend falls back to app.institute.default-id.
     */
    private String subdomain;
}
