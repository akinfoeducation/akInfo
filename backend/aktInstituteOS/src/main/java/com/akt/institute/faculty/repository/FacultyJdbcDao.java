package com.akt.institute.faculty.repository;

import com.akt.institute.faculty.domain.FacultyProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class FacultyJdbcDao implements FacultyDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_COLS = """
            fp.id, fp.institute_id, fp.user_id,
            fp.qualification, fp.experience_years, fp.subjects, fp.skills,
            fp.employee_type, fp.bio, fp.linkedin_url,
            fp.created_at, fp.updated_at,
            u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
            u.designation, u.employee_id, u.username
            """;

    private static final String BASE_SELECT = """
            SELECT %s
            FROM faculty_profiles fp
            JOIN users u ON u.id = fp.user_id
            WHERE fp.deleted_at IS NULL
            """.formatted(SELECT_COLS);

    private static final RowMapper<FacultyProfile> ROW_MAPPER = (rs, row) -> mapRow(rs);

    private static FacultyProfile mapRow(ResultSet rs) throws SQLException {
        FacultyProfile fp = new FacultyProfile();
        fp.setId(rs.getLong("id"));
        fp.setInstituteId(rs.getLong("institute_id"));
        fp.setUserId(rs.getLong("user_id"));
        fp.setQualification(rs.getString("qualification"));
        fp.setExperienceYears(rs.getInt("experience_years"));
        fp.setSubjects(rs.getString("subjects"));
        fp.setSkills(rs.getString("skills"));
        fp.setEmployeeType(rs.getString("employee_type"));
        fp.setBio(rs.getString("bio"));
        fp.setLinkedinUrl(rs.getString("linkedin_url"));
        Timestamp ca = rs.getTimestamp("created_at");
        Timestamp ua = rs.getTimestamp("updated_at");
        if (ca != null) fp.setCreatedAt(ca.toInstant());
        if (ua != null) fp.setUpdatedAt(ua.toInstant());
        fp.setFirstName(rs.getString("first_name"));
        fp.setLastName(rs.getString("last_name"));
        fp.setEmail(rs.getString("email"));
        fp.setPhone(rs.getString("phone"));
        fp.setAvatarUrl(rs.getString("avatar_url"));
        fp.setDesignation(rs.getString("designation"));
        fp.setEmployeeId(rs.getString("employee_id"));
        fp.setUsername(rs.getString("username"));
        return fp;
    }

    @Override
    public List<FacultyProfile> findAll(Long instituteId) {
        return jdbc.query(BASE_SELECT + " AND fp.institute_id = :iid ORDER BY u.first_name",
                Map.of("iid", instituteId), ROW_MAPPER);
    }

    @Override
    public Optional<FacultyProfile> findByUserId(Long userId, Long instituteId) {
        var rows = jdbc.query(BASE_SELECT + " AND fp.user_id = :uid AND fp.institute_id = :iid",
                Map.of("uid", userId, "iid", instituteId), ROW_MAPPER);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public Optional<FacultyProfile> findById(Long id, Long instituteId) {
        var rows = jdbc.query(BASE_SELECT + " AND fp.id = :id AND fp.institute_id = :iid",
                Map.of("id", id, "iid", instituteId), ROW_MAPPER);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public FacultyProfile upsert(FacultyProfile fp) {
        var existing = findByUserId(fp.getUserId(), fp.getInstituteId());
        if (existing.isPresent()) {
            jdbc.update("""
                    UPDATE faculty_profiles SET
                        qualification=:q, experience_years=:exp, subjects=:sub, skills=:sk,
                        employee_type=:et, bio=:bio, linkedin_url=:li,
                        updated_by=:ub, updated_at=CURRENT_TIMESTAMP
                    WHERE user_id=:uid AND institute_id=:iid AND deleted_at IS NULL
                    """, buildParams(fp));
            fp.setId(existing.get().getId());
        } else {
            var kh = new GeneratedKeyHolder();
            jdbc.update("""
                    INSERT INTO faculty_profiles
                        (institute_id,user_id,qualification,experience_years,subjects,skills,
                         employee_type,bio,linkedin_url,created_by,updated_by)
                    VALUES
                        (:iid,:uid,:q,:exp,:sub,:sk,:et,:bio,:li,:cb,:ub)
                    """, new MapSqlParameterSource(buildParams(fp).getValues()), kh, new String[]{"id"});
            fp.setId(((Number) kh.getKeys().get("id")).longValue());
        }
        return findByUserId(fp.getUserId(), fp.getInstituteId()).orElse(fp);
    }

    private MapSqlParameterSource buildParams(FacultyProfile fp) {
        return new MapSqlParameterSource()
                .addValue("iid", fp.getInstituteId())
                .addValue("uid", fp.getUserId())
                .addValue("q",   fp.getQualification())
                .addValue("exp", fp.getExperienceYears())
                .addValue("sub", fp.getSubjects())
                .addValue("sk",  fp.getSkills())
                .addValue("et",  fp.getEmployeeType())
                .addValue("bio", fp.getBio())
                .addValue("li",  fp.getLinkedinUrl())
                .addValue("cb",  fp.getCreatedBy())
                .addValue("ub",  fp.getUpdatedBy());
    }
}
