package com.akt.institute.auth.repository;

import com.akt.institute.auth.domain.RefreshToken;
import com.akt.institute.auth.domain.User;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class RefreshTokenJdbcDao implements RefreshTokenDao {

    private final NamedParameterJdbcTemplate jdbc;
    private final UserDao userDao;

    @Override
    public RefreshToken save(RefreshToken token) {
        if (token.getId() == null) {
            return insert(token);
        }
        return update(token);
    }

    @Override
    public Optional<RefreshToken> findByTokenHash(String tokenHash) {
        String sql = """
                SELECT rt.id, rt.user_id, rt.token_hash, rt.expires_at, rt.is_revoked,
                       rt.revoked_at, rt.revoke_reason, rt.ip_address, rt.user_agent, rt.created_at
                FROM refresh_tokens rt
                WHERE rt.token_hash = :tokenHash
                """;
        var params = new MapSqlParameterSource("tokenHash", tokenHash);
        List<RefreshToken> results = jdbc.query(sql, params, this::mapRow);
        if (results.isEmpty()) return Optional.empty();

        RefreshToken token = results.get(0);
        // Load the full user (with roles/permissions) for principal creation
        userDao.findById(token.getUser().getId()).ifPresent(token::setUser);
        return Optional.of(token);
    }

    @Override
    public void revokeAllByUser(User user, Instant now, String reason) {
        String sql = """
                UPDATE refresh_tokens
                SET is_revoked = TRUE, revoked_at = :now, revoke_reason = :reason
                WHERE user_id = :userId AND is_revoked = FALSE
                """;
        jdbc.update(sql, new MapSqlParameterSource()
                .addValue("now", Timestamp.from(now))
                .addValue("reason", reason)
                .addValue("userId", user.getId()));
    }

    @Override
    public void deleteExpiredAndRevoked(Instant now) {
        String sql = "DELETE FROM refresh_tokens WHERE expires_at < :now OR is_revoked = TRUE";
        jdbc.update(sql, new MapSqlParameterSource("now", Timestamp.from(now)));
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private RefreshToken insert(RefreshToken token) {
        String sql = """
                INSERT INTO refresh_tokens
                    (user_id, token_hash, expires_at, is_revoked, ip_address, user_agent, created_at)
                VALUES
                    (:userId, :tokenHash, :expiresAt, FALSE, :ipAddress, :userAgent, CURRENT_TIMESTAMP)
                """;
        var params = new MapSqlParameterSource()
                .addValue("userId", token.getUser().getId())
                .addValue("tokenHash", token.getTokenHash())
                .addValue("expiresAt", Timestamp.from(token.getExpiresAt()))
                .addValue("ipAddress", token.getIpAddress())
                .addValue("userAgent", token.getUserAgent());
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(sql, params, keyHolder, new String[]{"id"});
        token.setId(Objects.requireNonNull(keyHolder.getKeyAs(Long.class)));
        return token;
    }

    private RefreshToken update(RefreshToken token) {
        String sql = """
                UPDATE refresh_tokens
                SET is_revoked = :isRevoked, revoked_at = :revokedAt, revoke_reason = :revokeReason
                WHERE id = :id
                """;
        jdbc.update(sql, new MapSqlParameterSource()
                .addValue("isRevoked", token.isRevoked())
                .addValue("revokedAt", toTimestamp(token.getRevokedAt()))
                .addValue("revokeReason", token.getRevokeReason())
                .addValue("id", token.getId()));
        return token;
    }

    private RefreshToken mapRow(ResultSet rs, int rowNum) throws SQLException {
        RefreshToken token = new RefreshToken();
        token.setId(rs.getLong("id"));
        token.setTokenHash(rs.getString("token_hash"));
        token.setExpiresAt(rs.getTimestamp("expires_at").toInstant());
        token.setRevoked(rs.getBoolean("is_revoked"));
        Timestamp revokedAt = rs.getTimestamp("revoked_at");
        if (revokedAt != null) token.setRevokedAt(revokedAt.toInstant());
        token.setRevokeReason(rs.getString("revoke_reason"));
        token.setIpAddress(rs.getString("ip_address"));
        token.setUserAgent(rs.getString("user_agent"));
        Timestamp createdAt = rs.getTimestamp("created_at");
        if (createdAt != null) token.setCreatedAt(createdAt.toInstant());
        // Set a stub User with just the id; caller resolves it fully if needed
        User stub = new User();
        stub.setId(rs.getLong("user_id"));
        token.setUser(stub);
        return token;
    }

    private static Timestamp toTimestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }
}
