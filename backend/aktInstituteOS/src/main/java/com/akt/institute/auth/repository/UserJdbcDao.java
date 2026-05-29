package com.akt.institute.auth.repository;

import com.akt.institute.auth.domain.Permission;
import com.akt.institute.auth.domain.Role;
import com.akt.institute.auth.domain.User;
import com.akt.institute.shared.util.AuditUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Repository
@RequiredArgsConstructor
public class UserJdbcDao implements UserDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_COLS = """
            u.id, u.uuid, u.institute_id, u.username, u.email, u.password_hash,
            u.first_name, u.last_name, u.phone, u.avatar_url, u.is_active,
            u.is_email_verified, u.last_login_at, u.password_changed_at,
            u.failed_login_attempts, u.locked_until,
            u.created_at, u.updated_at, u.created_by, u.updated_by, u.deleted_at,
            r.id AS r_id, r.institute_id AS r_institute_id, r.name AS r_name,
            r.code AS r_code, r.description AS r_description,
            r.is_system AS r_is_system, r.is_active AS r_is_active,
            p.id AS p_id, p.name AS p_name, p.code AS p_code,
            p.resource AS p_resource, p.action AS p_action, p.description AS p_description
            """;

    private static final String BASE_FROM = """
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id AND r.is_active = TRUE
            LEFT JOIN role_permissions rp ON rp.role_id = r.id
            LEFT JOIN permissions p ON p.id = rp.permission_id
            WHERE u.deleted_at IS NULL
            """;

    @Override
    public Optional<User> findById(Long id) {
        String sql = "SELECT " + SELECT_COLS + BASE_FROM + " AND u.id = :id";
        var params = new MapSqlParameterSource("id", id);
        return querySingleUser(sql, params);
    }

    @Override
    public Optional<User> findByEmailOrUsernameAndInstituteId(String identifier, Long instituteId) {
        String sql = "SELECT " + SELECT_COLS + BASE_FROM
                + " AND (u.email = :id OR u.username = :id) AND u.institute_id = :instituteId";
        var params = new MapSqlParameterSource()
                .addValue("id", identifier)
                .addValue("instituteId", instituteId);
        return querySingleUser(sql, params);
    }

    @Override
    public Optional<User> findByEmailAndInstituteId(String email, Long instituteId) {
        String sql = "SELECT " + SELECT_COLS + BASE_FROM
                + " AND u.email = :email AND u.institute_id = :instituteId";
        var params = new MapSqlParameterSource()
                .addValue("email", email)
                .addValue("instituteId", instituteId);
        return querySingleUser(sql, params);
    }

    @Override
    public Optional<User> findByUsernameAndInstituteId(String username, Long instituteId) {
        String sql = "SELECT " + SELECT_COLS + BASE_FROM
                + " AND u.username = :username AND u.institute_id = :instituteId";
        var params = new MapSqlParameterSource()
                .addValue("username", username)
                .addValue("instituteId", instituteId);
        return querySingleUser(sql, params);
    }

    @Override
    public boolean existsByEmailAndInstituteId(String email, Long instituteId) {
        String sql = "SELECT COUNT(1) FROM users WHERE email = :email AND institute_id = :instituteId AND deleted_at IS NULL";
        var params = new MapSqlParameterSource()
                .addValue("email", email)
                .addValue("instituteId", instituteId);
        Long count = jdbc.queryForObject(sql, params, Long.class);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByUsernameAndInstituteId(String username, Long instituteId) {
        String sql = "SELECT COUNT(1) FROM users WHERE username = :username AND institute_id = :instituteId AND deleted_at IS NULL";
        var params = new MapSqlParameterSource()
                .addValue("username", username)
                .addValue("instituteId", instituteId);
        Long count = jdbc.queryForObject(sql, params, Long.class);
        return count != null && count > 0;
    }

    @Override
    public User save(User user) {
        if (user.getId() == null) {
            return insert(user);
        }
        return update(user);
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private Optional<User> querySingleUser(String sql, MapSqlParameterSource params) {
        List<User> users = jdbc.query(sql, params, this::extractUsers);
        return (users == null || users.isEmpty()) ? Optional.empty() : Optional.of(users.get(0));
    }

    private User insert(User user) {
        String sql = """
                INSERT INTO users (uuid, institute_id, username, email, password_hash,
                    first_name, last_name, phone, avatar_url, is_active, is_email_verified,
                    last_login_at, password_changed_at, failed_login_attempts, locked_until,
                    created_at, updated_at, created_by, updated_by)
                VALUES (:uuid, :instituteId, :username, :email, :passwordHash,
                    :firstName, :lastName, :phone, :avatarUrl, :isActive, :isEmailVerified,
                    :lastLoginAt, :passwordChangedAt, :failedLoginAttempts, :lockedUntil,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, :createdBy, :updatedBy)
                """;
        var params = buildParams(user);
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(sql, params, keyHolder, new String[]{"id"});
        user.setId(Objects.requireNonNull(keyHolder.getKeyAs(Long.class)));
        return user;
    }

    private User update(User user) {
        String sql = """
                UPDATE users SET
                    username = :username, email = :email, password_hash = :passwordHash,
                    first_name = :firstName, last_name = :lastName, phone = :phone,
                    avatar_url = :avatarUrl, is_active = :isActive, is_email_verified = :isEmailVerified,
                    last_login_at = :lastLoginAt, password_changed_at = :passwordChangedAt,
                    failed_login_attempts = :failedLoginAttempts, locked_until = :lockedUntil,
                    deleted_at = :deletedAt, updated_at = CURRENT_TIMESTAMP, updated_by = :updatedBy
                WHERE id = :id
                """;
        var params = buildParams(user).addValue("id", user.getId())
                .addValue("deletedAt", toTimestamp(user.getDeletedAt()));
        jdbc.update(sql, params);
        return user;
    }

    private MapSqlParameterSource buildParams(User user) {
        Long currentUserId = AuditUtil.getCurrentUserId();
        return new MapSqlParameterSource()
                .addValue("uuid", user.getUuid())
                .addValue("instituteId", user.getInstituteId())
                .addValue("username", user.getUsername())
                .addValue("email", user.getEmail())
                .addValue("passwordHash", user.getPasswordHash())
                .addValue("firstName", user.getFirstName())
                .addValue("lastName", user.getLastName())
                .addValue("phone", user.getPhone())
                .addValue("avatarUrl", user.getAvatarUrl())
                .addValue("isActive", user.isActive())
                .addValue("isEmailVerified", user.isEmailVerified())
                .addValue("lastLoginAt", toTimestamp(user.getLastLoginAt()))
                .addValue("passwordChangedAt", toTimestamp(user.getPasswordChangedAt()))
                .addValue("failedLoginAttempts", user.getFailedLoginAttempts())
                .addValue("lockedUntil", toTimestamp(user.getLockedUntil()))
                .addValue("createdBy", currentUserId)
                .addValue("updatedBy", currentUserId);
    }

    private List<User> extractUsers(ResultSet rs) throws SQLException {
        Map<Long, User> userMap = new LinkedHashMap<>();
        Map<Long, Map<Long, Role>> userRolesMap = new LinkedHashMap<>();
        Map<Long, Set<Long>> rolePermIdMap = new LinkedHashMap<>();

        while (rs.next()) {
            long userId = rs.getLong("id");

            userMap.computeIfAbsent(userId, id -> {
                try {
                    return mapUser(rs);
                } catch (SQLException e) {
                    throw new RuntimeException(e);
                }
            });

            long roleId = rs.getLong("r_id");
            if (!rs.wasNull()) {
                Map<Long, Role> rolesForUser = userRolesMap.computeIfAbsent(userId, k -> new LinkedHashMap<>());
                rolesForUser.computeIfAbsent(roleId, rId -> {
                    try {
                        return mapRole(rs);
                    } catch (SQLException e) {
                        throw new RuntimeException(e);
                    }
                });

                long permId = rs.getLong("p_id");
                if (!rs.wasNull()) {
                    Set<Long> seenPerms = rolePermIdMap.computeIfAbsent(roleId, k -> new HashSet<>());
                    if (seenPerms.add(permId)) {
                        try {
                            rolesForUser.get(roleId).getPermissions().add(mapPermission(rs));
                        } catch (SQLException e) {
                            throw new RuntimeException(e);
                        }
                    }
                }
            }
        }

        userRolesMap.forEach((userId, roles) ->
                userMap.get(userId).setRoles(new HashSet<>(roles.values())));

        return new ArrayList<>(userMap.values());
    }

    private static User mapUser(ResultSet rs) throws SQLException {
        User u = new User();
        u.setId(rs.getLong("id"));
        u.setUuid(rs.getString("uuid"));
        u.setInstituteId(rs.getLong("institute_id"));
        u.setUsername(rs.getString("username"));
        u.setEmail(rs.getString("email"));
        u.setPasswordHash(rs.getString("password_hash"));
        u.setFirstName(rs.getString("first_name"));
        u.setLastName(rs.getString("last_name"));
        u.setPhone(rs.getString("phone"));
        u.setAvatarUrl(rs.getString("avatar_url"));
        u.setActive(rs.getBoolean("is_active"));
        u.setEmailVerified(rs.getBoolean("is_email_verified"));
        u.setLastLoginAt(toInstant(rs.getTimestamp("last_login_at")));
        u.setPasswordChangedAt(toInstant(rs.getTimestamp("password_changed_at")));
        u.setFailedLoginAttempts(rs.getInt("failed_login_attempts"));
        u.setLockedUntil(toInstant(rs.getTimestamp("locked_until")));
        u.setCreatedAt(toInstant(rs.getTimestamp("created_at")));
        u.setUpdatedAt(toInstant(rs.getTimestamp("updated_at")));
        u.setDeletedAt(toInstant(rs.getTimestamp("deleted_at")));
        long createdBy = rs.getLong("created_by");
        if (!rs.wasNull()) u.setCreatedBy(createdBy);
        long updatedBy = rs.getLong("updated_by");
        if (!rs.wasNull()) u.setUpdatedBy(updatedBy);
        return u;
    }

    private static Role mapRole(ResultSet rs) throws SQLException {
        Role role = new Role();
        role.setId(rs.getLong("r_id"));
        role.setInstituteId(rs.getLong("r_institute_id"));
        role.setName(rs.getString("r_name"));
        role.setCode(rs.getString("r_code"));
        role.setDescription(rs.getString("r_description"));
        role.setSystem(rs.getBoolean("r_is_system"));
        role.setActive(rs.getBoolean("r_is_active"));
        role.setPermissions(new HashSet<>());
        return role;
    }

    private static Permission mapPermission(ResultSet rs) throws SQLException {
        Permission p = new Permission();
        p.setId(rs.getLong("p_id"));
        p.setName(rs.getString("p_name"));
        p.setCode(rs.getString("p_code"));
        p.setResource(rs.getString("p_resource"));
        p.setAction(rs.getString("p_action"));
        p.setDescription(rs.getString("p_description"));
        return p;
    }

    private static Instant toInstant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }

    private static Timestamp toTimestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }
}
