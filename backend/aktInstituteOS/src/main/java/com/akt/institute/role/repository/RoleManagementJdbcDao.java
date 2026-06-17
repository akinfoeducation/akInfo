package com.akt.institute.role.repository;

import com.akt.institute.auth.domain.Permission;
import com.akt.institute.auth.domain.Role;
import com.akt.institute.shared.util.AuditUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.*;

@Repository
@RequiredArgsConstructor
public class RoleManagementJdbcDao implements RoleManagementDao {

    private final NamedParameterJdbcTemplate jdbc;

    // ── findAllByInstituteId ──────────────────────────────────────────────

    @Override
    public List<Role> findAllByInstituteId(Long instituteId) {
        String sql = """
                SELECT r.id, r.institute_id, r.name, r.code, r.description,
                       r.is_system, r.is_active, r.created_at, r.updated_at,
                       p.id AS p_id, p.name AS p_name, p.code AS p_code,
                       p.resource, p.action, p.description AS p_desc
                FROM roles r
                LEFT JOIN role_permissions rp ON rp.role_id = r.id
                LEFT JOIN permissions p ON p.id = rp.permission_id
                WHERE r.institute_id = :iid AND r.deleted_at IS NULL
                ORDER BY r.is_system DESC, r.name ASC
                """;
        return jdbc.query(sql, new MapSqlParameterSource("iid", instituteId), this::extractRoles);
    }

    // ── findByIdAndInstituteId ────────────────────────────────────────────

    @Override
    public Optional<Role> findByIdAndInstituteId(Long id, Long instituteId) {
        String sql = """
                SELECT r.id, r.institute_id, r.name, r.code, r.description,
                       r.is_system, r.is_active, r.created_at, r.updated_at,
                       p.id AS p_id, p.name AS p_name, p.code AS p_code,
                       p.resource, p.action, p.description AS p_desc
                FROM roles r
                LEFT JOIN role_permissions rp ON rp.role_id = r.id
                LEFT JOIN permissions p ON p.id = rp.permission_id
                WHERE r.id = :id AND r.institute_id = :iid AND r.deleted_at IS NULL
                """;
        List<Role> roles = jdbc.query(sql,
                new MapSqlParameterSource().addValue("id", id).addValue("iid", instituteId),
                this::extractRoles);
        return roles.isEmpty() ? Optional.empty() : Optional.of(roles.get(0));
    }

    // ── existsByCode ──────────────────────────────────────────────────────

    @Override
    public boolean existsByCodeAndInstituteId(String code, Long instituteId) {
        Long c = jdbc.queryForObject(
                "SELECT COUNT(1) FROM roles WHERE code=:code AND institute_id=:iid AND deleted_at IS NULL",
                new MapSqlParameterSource().addValue("code", code).addValue("iid", instituteId), Long.class);
        return c != null && c > 0;
    }

    // ── save ─────────────────────────────────────────────────────────────

    @Override
    public Role save(Role role) {
        return role.getId() == null ? insert(role) : update(role);
    }

    // ── softDelete ────────────────────────────────────────────────────────

    @Override
    public void softDelete(Long id, Long deletedBy) {
        jdbc.update("""
                UPDATE roles SET deleted_at=CURRENT_TIMESTAMP, is_active=FALSE, updated_by=:by
                WHERE id=:id
                """, new MapSqlParameterSource().addValue("id", id).addValue("by", deletedBy));
    }

    // ── assignPermissions (replace-all) ───────────────────────────────────

    @Override
    public void assignPermissions(Long roleId, Set<Long> permissionIds) {
        // Delete existing
        jdbc.update("DELETE FROM role_permissions WHERE role_id=:rid",
                new MapSqlParameterSource("rid", roleId));
        if (permissionIds == null || permissionIds.isEmpty()) return;
        // Insert new
        var batchParams = permissionIds.stream()
                .map(pid -> new MapSqlParameterSource()
                        .addValue("rid", roleId)
                        .addValue("pid", pid))
                .toArray(MapSqlParameterSource[]::new);
        jdbc.batchUpdate("INSERT INTO role_permissions (role_id, permission_id) VALUES (:rid,:pid) ON CONFLICT DO NOTHING",
                batchParams);
    }

    // ── countUsersWithRole ────────────────────────────────────────────────

    @Override
    public int countUsersWithRole(Long roleId) {
        Long c = jdbc.queryForObject(
                "SELECT COUNT(1) FROM user_roles WHERE role_id=:rid",
                new MapSqlParameterSource("rid", roleId), Long.class);
        return c != null ? c.intValue() : 0;
    }

    @Override
    public java.util.Map<Long, Integer> countUsersPerRole(java.util.Set<Long> roleIds) {
        if (roleIds == null || roleIds.isEmpty()) return java.util.Collections.emptyMap();
        java.util.Map<Long, Integer> result = new java.util.HashMap<>();
        roleIds.forEach(id -> result.put(id, 0)); // default 0
        jdbc.query(
                "SELECT role_id, COUNT(1) AS cnt FROM user_roles WHERE role_id IN (:ids) GROUP BY role_id",
                new MapSqlParameterSource("ids", roleIds),
                rs -> { result.put(rs.getLong("role_id"), rs.getInt("cnt")); });
        return result;
    }

    // ── findAllPermissions ────────────────────────────────────────────────

    @Override
    public List<Permission> findAllPermissions() {
        return jdbc.query("""
                SELECT id, name, code, resource, action, description
                FROM permissions ORDER BY resource, action
                """, new MapSqlParameterSource(), (rs, rn) -> {
            // Direct column names — not the p_ aliases used in JOIN queries
            Permission p = new Permission();
            p.setId(rs.getLong("id"));
            p.setName(rs.getString("name"));
            p.setCode(rs.getString("code"));
            p.setResource(rs.getString("resource"));
            p.setAction(rs.getString("action"));
            p.setDescription(rs.getString("description"));
            return p;
        });
    }

    // ── private helpers ───────────────────────────────────────────────────

    private Role insert(Role role) {
        Long actor = AuditUtil.getCurrentUserId();
        var kh = new GeneratedKeyHolder();
        jdbc.update("""
                INSERT INTO roles (institute_id, name, code, description, is_system, is_active,
                    created_at, updated_at, created_by, updated_by)
                VALUES (:iid,:name,:code,:desc,:system,:active,
                    CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,:by,:by)
                """, new MapSqlParameterSource()
                        .addValue("iid",    role.getInstituteId())
                        .addValue("name",   role.getName())
                        .addValue("code",   role.getCode().toUpperCase())
                        .addValue("desc",   role.getDescription())
                        .addValue("system", role.isSystem())
                        .addValue("active", role.isActive())
                        .addValue("by",     actor),
                kh, new String[]{"id"});
        role.setId(Objects.requireNonNull(kh.getKeyAs(Long.class)));
        return role;
    }

    private Role update(Role role) {
        Long actor = AuditUtil.getCurrentUserId();
        jdbc.update("""
                UPDATE roles SET name=:name, code=:code, description=:desc,
                    is_active=:active, updated_at=CURRENT_TIMESTAMP, updated_by=:by
                WHERE id=:id
                """, new MapSqlParameterSource()
                        .addValue("name",   role.getName())
                        .addValue("code",   role.getCode().toUpperCase())
                        .addValue("desc",   role.getDescription())
                        .addValue("active", role.isActive())
                        .addValue("by",     actor)
                        .addValue("id",     role.getId()));
        return role;
    }

    private List<Role> extractRoles(ResultSet rs) throws SQLException {
        Map<Long, Role> roleMap = new LinkedHashMap<>();
        Map<Long, Set<Long>> rolePermIds = new LinkedHashMap<>();
        while (rs.next()) {
            long rid = rs.getLong("id");
            roleMap.computeIfAbsent(rid, k -> {
                try { return mapRole(rs); } catch (SQLException e) { throw new RuntimeException(e); }
            });
            long pid = rs.getLong("p_id");
            if (!rs.wasNull()) {
                rolePermIds.computeIfAbsent(rid, k -> new HashSet<>());
                if (rolePermIds.get(rid).add(pid)) {
                    try { roleMap.get(rid).getPermissions().add(mapPermission(rs)); }
                    catch (SQLException e) { throw new RuntimeException(e); }
                }
            }
        }
        return new ArrayList<>(roleMap.values());
    }

    private Role mapRole(ResultSet rs) throws SQLException {
        Role r = new Role();
        r.setId(rs.getLong("id"));
        r.setInstituteId(rs.getLong("institute_id"));
        r.setName(rs.getString("name"));
        r.setCode(rs.getString("code"));
        r.setDescription(rs.getString("description"));
        r.setSystem(rs.getBoolean("is_system"));
        r.setActive(rs.getBoolean("is_active"));
        r.setPermissions(new HashSet<>());
        Timestamp ca = rs.getTimestamp("created_at"); if (ca != null) r.setCreatedAt(ca.toInstant());
        Timestamp ua = rs.getTimestamp("updated_at"); if (ua != null) r.setUpdatedAt(ua.toInstant());
        return r;
    }

    private Permission mapPermission(ResultSet rs) throws SQLException {
        Permission p = new Permission();
        p.setId(rs.getLong("p_id"));
        p.setName(rs.getString("p_name"));
        p.setCode(rs.getString("p_code"));
        p.setResource(rs.getString("resource"));
        p.setAction(rs.getString("action"));
        p.setDescription(rs.getString("p_desc"));
        return p;
    }
}
