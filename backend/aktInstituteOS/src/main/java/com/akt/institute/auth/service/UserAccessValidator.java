package com.akt.institute.auth.service;

import com.akt.institute.auth.domain.User;
import com.akt.institute.auth.repository.UserDao;
import com.akt.institute.shared.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Objects;

/**
 * Validates that a client-supplied user id is a legitimate target for assignment / handoff.
 *
 * Without this, endpoints that accept a {@code callerId} / {@code counsellorId} in the request body
 * trust the id blindly — allowing a lead to be assigned to a non-existent, inactive, wrong-role, or
 * cross-institute user (privilege escalation / data leak). See audit finding C1.
 */
@Service
@RequiredArgsConstructor
public class UserAccessValidator {

    private final UserDao userDao;

    /**
     * Ensure {@code userId} is an active user of {@code instituteId} holding role {@code roleCode}.
     *
     * @throws BusinessException 400 if the id is null, unknown, inactive, in another institute, or
     *                           lacks the required role.
     */
    public void requireActiveUserWithRole(Long userId, Long instituteId, String roleCode) {
        if (userId == null) {
            throw new BusinessException(
                "A target " + roleCode.toLowerCase() + " is required",
                "USER_REQUIRED", HttpStatus.BAD_REQUEST);
        }
        User user = userDao.findById(userId)
            .filter(u -> Objects.equals(u.getInstituteId(), instituteId))
            .filter(User::isActive)
            .orElseThrow(() -> new BusinessException(
                "User " + userId + " does not exist or is not active in this institute",
                "INVALID_TARGET_USER", HttpStatus.BAD_REQUEST));

        boolean hasRole = user.getRoles().stream()
            .anyMatch(r -> roleCode.equalsIgnoreCase(r.getCode()));
        if (!hasRole) {
            throw new BusinessException(
                "User " + userId + " is not a " + roleCode,
                "INVALID_TARGET_ROLE", HttpStatus.BAD_REQUEST);
        }
    }
}
