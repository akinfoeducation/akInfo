package com.akt.institute.branch.repository;

import com.akt.institute.branch.domain.Branch;
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
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class BranchJdbcDao implements BranchDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_SQL = """
            SELECT id, uuid, institute_id, name, code, address, city, phone, email,
                   is_active, created_at, updated_at, created_by, updated_by
            FROM branches WHERE deleted_at IS NULL
            """;

    @Override
    public Branch save(Branch branch) {
        return branch.getId() == null ? insert(branch) : update(branch);
    }

    @Override
    public Optional<Branch> findByIdAndInstituteId(Long id, Long instituteId) {
        String sql = SELECT_SQL + " AND id = :id AND institute_id = :iid";
        var params = new MapSqlParameterSource().addValue("id", id).addValue("iid", instituteId);
        List<Branch> results = jdbc.query(sql, params, (rs, rn) -> mapRow(rs));
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    @Override
    public List<Branch> findAllByInstituteId(Long instituteId) {
        String sql = SELECT_SQL + " AND institute_id = :iid ORDER BY name ASC";
        return jdbc.query(sql, new MapSqlParameterSource("iid", instituteId), (rs, rn) -> mapRow(rs));
    }

    @Override
    public boolean existsByCodeAndInstituteId(String code, Long instituteId) {
        String sql = "SELECT COUNT(1) FROM branches WHERE code = :code AND institute_id = :iid AND deleted_at IS NULL";
        Long c = jdbc.queryForObject(sql, new MapSqlParameterSource().addValue("code", code).addValue("iid", instituteId), Long.class);
        return c != null && c > 0;
    }

    @Override
    public void softDelete(Long id, Long deletedBy) {
        jdbc.update("UPDATE branches SET deleted_at = CURRENT_TIMESTAMP, updated_by = :by WHERE id = :id",
                new MapSqlParameterSource().addValue("id", id).addValue("by", deletedBy));
    }

    // ── private helpers ───────────────────────────────────────────────────

    private Branch insert(Branch b) {
        Long actorId = AuditUtil.getCurrentUserId();
        String sql = """
                INSERT INTO branches (uuid, institute_id, name, code, address, city, phone, email,
                    is_active, created_at, updated_at, created_by, updated_by)
                VALUES (:uuid, :iid, :name, :code, :address, :city, :phone, :email,
                    :active, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, :by, :by)
                """;
        var params = buildParams(b, actorId);
        var kh = new GeneratedKeyHolder();
        jdbc.update(sql, params, kh, new String[]{"id"});
        b.setId(Objects.requireNonNull(kh.getKeyAs(Long.class)));
        return b;
    }

    private Branch update(Branch b) {
        Long actorId = AuditUtil.getCurrentUserId();
        jdbc.update("""
                UPDATE branches SET name=:name, code=:code, address=:address, city=:city,
                    phone=:phone, email=:email, is_active=:active,
                    updated_at=CURRENT_TIMESTAMP, updated_by=:by
                WHERE id=:id
                """, buildParams(b, actorId).addValue("id", b.getId()));
        return b;
    }

    private MapSqlParameterSource buildParams(Branch b, Long actorId) {
        return new MapSqlParameterSource()
                .addValue("uuid",    b.getUuid())
                .addValue("iid",     b.getInstituteId())
                .addValue("name",    b.getName())
                .addValue("code",    b.getCode().toUpperCase())
                .addValue("address", b.getAddress())
                .addValue("city",    b.getCity())
                .addValue("phone",   b.getPhone())
                .addValue("email",   b.getEmail())
                .addValue("active",  b.isActive())
                .addValue("by",      actorId);
    }

    private Branch mapRow(ResultSet rs) throws SQLException {
        Branch b = new Branch();
        b.setId(rs.getLong("id"));
        b.setUuid(rs.getString("uuid"));
        b.setInstituteId(rs.getLong("institute_id"));
        b.setName(rs.getString("name"));
        b.setCode(rs.getString("code"));
        b.setAddress(rs.getString("address"));
        b.setCity(rs.getString("city"));
        b.setPhone(rs.getString("phone"));
        b.setEmail(rs.getString("email"));
        b.setActive(rs.getBoolean("is_active"));
        Timestamp ca = rs.getTimestamp("created_at"); if (ca != null) b.setCreatedAt(ca.toInstant());
        Timestamp ua = rs.getTimestamp("updated_at"); if (ua != null) b.setUpdatedAt(ua.toInstant());
        return b;
    }
}
