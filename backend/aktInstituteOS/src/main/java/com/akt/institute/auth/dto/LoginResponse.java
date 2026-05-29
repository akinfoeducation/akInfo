package com.akt.institute.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.Set;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LoginResponse {

    private String accessToken;
    @Builder.Default
    private String tokenType = "Bearer";
    private long expiresIn; // seconds
    private UserInfo user;

    @Data
    @Builder
    public static class UserInfo {
        private Long id;
        private String email;
        private String username;
        private String firstName;
        private String lastName;
        private String fullName;
        private String avatarUrl;
        private Long instituteId;
        private Set<String> roles;
        private Set<String> permissions;
    }
}
