package com.akt.institute.department.repository;

import com.akt.institute.department.domain.Department;
import com.akt.institute.shared.util.AuditUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class DepartmentJdbcDao implements DepartmentDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_SQL = """
            SELECT id, uuid, institute_id, name, code, description, is_active, created_at, updated_at
            FROM departments WHERE deleted_at IS NULL
            """;

    @Override
    public Department save(Department d) {
        return d.getId() == null ? insert(d) : update(d);
    }

    @Override
    public Optional<Department> findByIdAndInstituteId(Long id, Long instituteId) {
        List<Department> r = jdbc.query(SELECT_SQL + " AND id=:id AND institute_id=:iid",
                new MapSqlParameterSource().addValue("id", id).addValue("iid", instituteId),
                (rs, rn) -> mapRow(rs));
        return r.isEmpty() ? Optional.empty() : Optional.of(r.get(0));
    }

    @Override
    public List<Department> findAllByInstituteId(Long instituteId) {
        return jdbc.query(SELECT_SQL + " AND institute_id=:iid ORDER BY name ASC",
                new MapSqlParameterSource("iid", instituteId), (rs, rn) -> mapRow(rs));
    }

    @Override
    public boolean existsByCodeAndInstituteId(String code, Long instituteId) {
        Long c = jdbc.queryForObject(
                "SELECT COUNT(1) FROM departments WHERE code=:code AND institute_id=:iid AND deleted_at IS NULL",
                new MapSqlParameterSource().addValue("code", code).addValue("iid", instituteId), Long.class);
        return c != null && c > 0;
    }

    @Override
    public void softDelete(Long id, Long deletedBy) {
        jdbc.update("UPDATE departments SET deleted_at=CURRENT_TIMESTAMP, updated_by=:by WHERE id=:id",
                new MapSqlParameterSource().addValue("id", id).addValue("by", deletedBy));
    }

    private Department insert(Department d) {
        Long actor = AuditUtil.getCurrentUserId();
        var kh = new GeneratedKeyHolder();
        jdbc.update("""
                INSERT INTO departments (uuid, institute_id, name, code, description, is_active,
                    created_at, updated_at, created_by, updated_by)
                VALUES (:uuid,:iid,:name,:code,:desc,:active,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,:by,:by)
                """, params(d, actor), kh, new String[]{"id"});
        d.setId(Objects.requireNonNull(kh.getKeyAs(Long.class)));
        return d;
    }

    private Department update(Department d) {
        Long actor = AuditUtil.getCurrentUserId();
        jdbc.update("""
                UPDATE departments SET name=:name, code=:code, description=:desc, is_active=:active,
                    updated_at=CURRENT_TIMESTAMP, updated_by=:by WHERE id=:id
                """, params(d, actor).addValue("id", d.getId()));
        return d;
    }

    private MapSqlParameterSource params(Department d, Long actor) {
        return new MapSqlParameterSource()
                .addValue("uuid",   d.getUuid())
                .addValue("iid",    d.getInstituteId())
                .addValue("name",   d.getName())
                .addValue("code",   d.getCode().toUpperCase())
                .addValue("desc",   d.getDescription())
                .addValue("active", d.isActive())
                .addValue("by",     actor);
    }

    private Department mapRow(ResultSet rs) throws SQLException {
        Department d = new Department();
        d.setId(rs.getLong("id"));
        d.setUuid(rs.getString("uuid"));
        d.setInstituteId(rs.getLong("institute_id"));
        d.setName(rs.getString("name"));
        d.setCode(rs.getString("code"));
        d.setDescription(rs.getString("description"));
        d.setActive(rs.getBoolean("is_active"));
        Timestamp ca = rs.getTimestamp("created_at"); if (ca != null) d.setCreatedAt(ca.toInstant());
        Timestamp ua = rs.getTimestamp("updated_at"); if (ua != null) d.setUpdatedAt(ua.toInstant());
        return d;
    }
}
