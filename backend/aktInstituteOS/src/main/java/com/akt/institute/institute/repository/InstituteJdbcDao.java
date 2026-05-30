package com.akt.institute.institute.repository;

import com.akt.institute.institute.domain.Institute;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class InstituteJdbcDao implements InstituteDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_SQL =
            "SELECT id, uuid, name, code, subdomain, is_active " +
            "FROM institutes " +
            "WHERE deleted_at IS NULL";

    @Override
    public Optional<Institute> findBySubdomain(String subdomain) {
        String sql = SELECT_SQL + " AND subdomain = :subdomain AND is_active = TRUE";
        var params = new MapSqlParameterSource("subdomain", subdomain);
        List<Institute> results = jdbc.query(sql, params, (rs, rowNum) -> mapInstitute(rs));
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    @Override
    public Optional<Institute> findById(Long id) {
        String sql = SELECT_SQL + " AND id = :id";
        var params = new MapSqlParameterSource("id", id);
        List<Institute> results = jdbc.query(sql, params, (rs, rowNum) -> mapInstitute(rs));
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    // ── private helper ────────────────────────────────────────────────────────

    private static Institute mapInstitute(ResultSet rs) throws SQLException {
        return Institute.builder()
                .id(rs.getLong("id"))
                .uuid(rs.getString("uuid"))
                .name(rs.getString("name"))
                .code(rs.getString("code"))
                .subdomain(rs.getString("subdomain"))
                .isActive(rs.getBoolean("is_active"))
                .build();
    }
}
