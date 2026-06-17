package com.akt.institute.session.service;

import com.akt.institute.audit.domain.AuditAction;
import com.akt.institute.audit.service.AuditService;
import com.akt.institute.session.domain.UserSession;
import com.akt.institute.session.dto.UserSessionResponse;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SessionService {

    private final NamedParameterJdbcTemplate jdbc;
    private final AuditService               auditService;

    // ── Create session on login ───────────────────────────────────────────

    @Transactional
    public UserSession create(Long userId, Long instituteId, String tokenHash,
                              String userAgent, String ip, Instant expiresAt) {
        DeviceInfo device = parseUserAgent(userAgent);
        UserSession session = UserSession.builder()
                .uuid(UUID.randomUUID().toString())
                .userId(userId).instituteId(instituteId)
                .tokenHash(tokenHash)
                .deviceName(device.name).deviceType(device.type)
                .browser(device.browser).os(device.os)
                .ipAddress(ip)
                .active(true)
                .lastActiveAt(Instant.now())
                .expiresAt(expiresAt)
                .build();
        var kh = new GeneratedKeyHolder();
        jdbc.update("""
                INSERT INTO user_sessions (uuid, user_id, institute_id, token_hash,
                    device_name, device_type, browser, os, ip_address, is_active,
                    last_active_at, expires_at, created_at)
                VALUES (:uuid,:uid,:iid,:th,:dn,:dt,:br,:os,:ip,TRUE,
                    CURRENT_TIMESTAMP,:exp,CURRENT_TIMESTAMP)
                """, new MapSqlParameterSource()
                        .addValue("uuid", session.getUuid())
                        .addValue("uid",  userId)
                        .addValue("iid",  instituteId)
                        .addValue("th",   tokenHash)
                        .addValue("dn",   device.name)
                        .addValue("dt",   device.type)
                        .addValue("br",   device.browser)
                        .addValue("os",   device.os)
                        .addValue("ip",   ip)
                        .addValue("exp",  Timestamp.from(expiresAt)),
                kh, new String[]{"id"});
        session.setId(Objects.requireNonNull(kh.getKeyAs(Long.class)));
        return session;
    }

    // ── My sessions ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<UserSessionResponse> getMySessions(Long userId, String currentTokenHash) {
        List<UserSession> sessions = jdbc.query("""
                SELECT id,uuid,user_id,institute_id,token_hash,device_name,device_type,
                       browser,os,ip_address,is_active,last_active_at,expires_at,created_at
                FROM user_sessions WHERE user_id=:uid AND expires_at > CURRENT_TIMESTAMP
                ORDER BY last_active_at DESC
                """, new MapSqlParameterSource("uid", userId), (rs, rn) -> mapRow(rs));
        return sessions.stream().map(s -> toResponse(s, currentTokenHash)).toList();
    }

    // ── Revoke a specific session ─────────────────────────────────────────

    @Transactional
    public void revokeSession(Long sessionId, Long userId, Long instituteId, Long actorId, String ip, String ua) {
        int updated = jdbc.update("""
                UPDATE user_sessions SET is_active=FALSE
                WHERE id=:id AND user_id=:uid
                """, new MapSqlParameterSource().addValue("id", sessionId).addValue("uid", userId));
        if (updated == 0) throw new ResourceNotFoundException("Session not found");
        auditService.log(instituteId, actorId, AuditAction.SESSION_REVOKED, "SESSION",
                String.valueOf(sessionId), ip, ua);
    }

    // ── Revoke all sessions for a user ────────────────────────────────────

    @Transactional
    public void revokeAllSessions(Long userId, Long instituteId, Long actorId, String ip, String ua) {
        jdbc.update("UPDATE user_sessions SET is_active=FALSE WHERE user_id=:uid",
                new MapSqlParameterSource("uid", userId));
        auditService.log(instituteId, actorId, AuditAction.ALL_SESSIONS_REVOKED, "SESSION",
                String.valueOf(userId), ip, ua);
    }

    // ── Deactivate session by token hash (called on logout) ───────────────

    @Transactional
    public void deactivateByTokenHash(String tokenHash) {
        jdbc.update("UPDATE user_sessions SET is_active=FALSE WHERE token_hash=:th",
                new MapSqlParameterSource("th", tokenHash));
    }

    // ── private helpers ───────────────────────────────────────────────────

    private UserSessionResponse toResponse(UserSession s, String currentTokenHash) {
        return UserSessionResponse.builder()
                .id(s.getId()).uuid(s.getUuid())
                .deviceName(s.getDeviceName()).deviceType(s.getDeviceType())
                .browser(s.getBrowser()).os(s.getOs()).ipAddress(s.getIpAddress())
                .active(s.isActive())
                .current(s.getTokenHash() != null && s.getTokenHash().equals(currentTokenHash))
                .lastActiveAt(s.getLastActiveAt()).expiresAt(s.getExpiresAt()).createdAt(s.getCreatedAt())
                .build();
    }

    private UserSession mapRow(ResultSet rs) throws SQLException {
        UserSession s = new UserSession();
        s.setId(rs.getLong("id"));
        s.setUuid(rs.getString("uuid"));
        s.setUserId(rs.getLong("user_id"));
        s.setInstituteId(rs.getLong("institute_id"));
        s.setTokenHash(rs.getString("token_hash"));
        s.setDeviceName(rs.getString("device_name"));
        s.setDeviceType(rs.getString("device_type"));
        s.setBrowser(rs.getString("browser"));
        s.setOs(rs.getString("os"));
        s.setIpAddress(rs.getString("ip_address"));
        s.setActive(rs.getBoolean("is_active"));
        Timestamp la = rs.getTimestamp("last_active_at"); if (la != null) s.setLastActiveAt(la.toInstant());
        Timestamp ex = rs.getTimestamp("expires_at");     if (ex != null) s.setExpiresAt(ex.toInstant());
        Timestamp ca = rs.getTimestamp("created_at");     if (ca != null) s.setCreatedAt(ca.toInstant());
        return s;
    }

    /** Lightweight UA parser — no external dependency. */
    private DeviceInfo parseUserAgent(String ua) {
        if (ua == null) return new DeviceInfo("Unknown Device", "WEB", "Unknown", "Unknown");
        String lower = ua.toLowerCase();
        String type   = lower.contains("mobile") || lower.contains("android") ? "MOBILE"
                      : lower.contains("tablet") || lower.contains("ipad")   ? "TABLET"
                      : "WEB";
        String browser = lower.contains("chrome")  ? "Chrome"
                       : lower.contains("firefox") ? "Firefox"
                       : lower.contains("safari")  ? "Safari"
                       : lower.contains("edge")    ? "Edge"
                       : "Unknown";
        String os     = lower.contains("windows")  ? "Windows"
                       : lower.contains("mac")     ? "macOS"
                       : lower.contains("linux")   ? "Linux"
                       : lower.contains("android") ? "Android"
                       : lower.contains("ios") || lower.contains("iphone") || lower.contains("ipad") ? "iOS"
                       : "Unknown";
        String name = browser + " on " + os;
        return new DeviceInfo(name, type, browser, os);
    }

    private record DeviceInfo(String name, String type, String browser, String os) {}
}
