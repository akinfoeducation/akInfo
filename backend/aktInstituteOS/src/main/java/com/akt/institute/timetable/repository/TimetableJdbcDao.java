package com.akt.institute.timetable.repository;

import com.akt.institute.timetable.domain.TimetableEntry;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class TimetableJdbcDao implements TimetableDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String BASE = """
            SELECT t.id, t.uuid, t.institute_id, t.batch_id, b.name batch_name,
                   t.faculty_user_id,
                   CONCAT(u.first_name,' ',COALESCE(u.last_name,'')) faculty_name,
                   t.subject, t.day_of_week, t.specific_date,
                   t.start_time, t.end_time, t.classroom, t.mode, t.online_link,
                   t.effective_from, t.effective_until, t.is_active,
                   t.created_at, t.updated_at, t.created_by, t.updated_by
            FROM timetable t
            LEFT JOIN batches b ON b.id = t.batch_id
            LEFT JOIN users   u ON u.id = t.faculty_user_id
            WHERE t.deleted_at IS NULL
            """;

    private static final RowMapper<TimetableEntry> ROW_MAPPER = (rs, row) -> map(rs);

    @Override
    public List<TimetableEntry> findAll(Long instituteId, Long batchId, Long facultyUserId) {
        var sql = new StringBuilder(BASE + " AND t.institute_id = :iid");
        var p   = new MapSqlParameterSource("iid", instituteId);
        if (batchId != null)       { sql.append(" AND t.batch_id = :bid");  p.addValue("bid", batchId); }
        if (facultyUserId != null) { sql.append(" AND t.faculty_user_id = :fid"); p.addValue("fid", facultyUserId); }
        sql.append(" ORDER BY t.day_of_week, t.start_time");
        return jdbc.query(sql.toString(), p, ROW_MAPPER);
    }

    @Override
    public List<TimetableEntry> findForDay(Long instituteId, int dayOfWeek, LocalDate date) {
        return jdbc.query(BASE + """
                 AND t.institute_id=:iid AND t.is_active=TRUE
                 AND (t.day_of_week=:dow OR t.specific_date=:dt)
                 AND (t.effective_from IS NULL OR t.effective_from<=:dt)
                 AND (t.effective_until IS NULL OR t.effective_until>=:dt)
                 ORDER BY t.start_time
                """,
                Map.of("iid", instituteId, "dow", dayOfWeek, "dt", date), ROW_MAPPER);
    }

    @Override
    public List<TimetableEntry> findByFaculty(Long facultyUserId, Long instituteId) {
        return jdbc.query(BASE + " AND t.faculty_user_id=:fid AND t.institute_id=:iid AND t.is_active=TRUE ORDER BY t.day_of_week, t.start_time",
                Map.of("fid", facultyUserId, "iid", instituteId), ROW_MAPPER);
    }

    @Override
    public Optional<TimetableEntry> findById(Long id, Long instituteId) {
        var rows = jdbc.query(BASE + " AND t.id=:id AND t.institute_id=:iid",
                Map.of("id", id, "iid", instituteId), ROW_MAPPER);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public TimetableEntry save(TimetableEntry e) {
        if (e.getId() != null) {
            jdbc.update("""
                    UPDATE timetable SET batch_id=:bid, faculty_user_id=:fid, subject=:sub,
                        day_of_week=:dow, specific_date=:dt, start_time=:st, end_time=:et,
                        classroom=:cl, mode=:md, online_link=:ol,
                        effective_from=:ef, effective_until=:eu, is_active=:ia,
                        updated_by=:ub, updated_at=CURRENT_TIMESTAMP
                    WHERE id=:id AND institute_id=:iid
                    """, params(e));
        } else {
            var kh = new GeneratedKeyHolder();
            jdbc.update("""
                    INSERT INTO timetable
                        (institute_id,batch_id,faculty_user_id,subject,day_of_week,specific_date,
                         start_time,end_time,classroom,mode,online_link,effective_from,effective_until,
                         is_active,created_by,updated_by)
                    VALUES
                        (:iid,:bid,:fid,:sub,:dow,:dt,:st,:et,:cl,:md,:ol,:ef,:eu,:ia,:cb,:ub)
                    """, new MapSqlParameterSource(params(e).getValues()), kh, new String[]{"id"});
            e.setId(((Number) kh.getKeys().get("id")).longValue());
        }
        return findById(e.getId(), e.getInstituteId()).orElse(e);
    }

    @Override
    public void delete(Long id, Long instituteId, Long actorId) {
        jdbc.update("UPDATE timetable SET deleted_at=CURRENT_TIMESTAMP, updated_by=:ub WHERE id=:id AND institute_id=:iid",
                Map.of("id", id, "iid", instituteId, "ub", actorId));
    }

    private MapSqlParameterSource params(TimetableEntry e) {
        return new MapSqlParameterSource()
                .addValue("id",  e.getId())
                .addValue("iid", e.getInstituteId())
                .addValue("bid", e.getBatchId())
                .addValue("fid", e.getFacultyUserId())
                .addValue("sub", e.getSubject())
                .addValue("dow", e.getDayOfWeek())
                .addValue("dt",  e.getSpecificDate())
                .addValue("st",  e.getStartTime() != null ? e.getStartTime().toString() : null)
                .addValue("et",  e.getEndTime()   != null ? e.getEndTime().toString()   : null)
                .addValue("cl",  e.getClassroom())
                .addValue("md",  e.getMode() != null ? e.getMode() : "OFFLINE")
                .addValue("ol",  e.getOnlineLink())
                .addValue("ef",  e.getEffectiveFrom())
                .addValue("eu",  e.getEffectiveUntil())
                .addValue("ia",  e.isActive())
                .addValue("cb",  e.getCreatedBy())
                .addValue("ub",  e.getUpdatedBy());
    }

    private static TimetableEntry map(ResultSet rs) throws SQLException {
        TimetableEntry e = new TimetableEntry();
        e.setId(rs.getLong("id"));
        e.setUuid(rs.getString("uuid"));
        e.setInstituteId(rs.getLong("institute_id"));
        e.setBatchId(rs.getLong("batch_id"));
        e.setBatchName(rs.getString("batch_name"));
        long fuid = rs.getLong("faculty_user_id"); if (!rs.wasNull()) e.setFacultyUserId(fuid);
        e.setFacultyName(rs.getString("faculty_name"));
        e.setSubject(rs.getString("subject"));
        int dow = rs.getInt("day_of_week"); if (!rs.wasNull()) e.setDayOfWeek(dow);
        var sd = rs.getDate("specific_date"); if (sd != null) e.setSpecificDate(sd.toLocalDate());
        var st = rs.getTime("start_time");    if (st != null) e.setStartTime(st.toLocalTime());
        var et = rs.getTime("end_time");      if (et != null) e.setEndTime(et.toLocalTime());
        e.setClassroom(rs.getString("classroom"));
        e.setMode(rs.getString("mode"));
        e.setOnlineLink(rs.getString("online_link"));
        var ef = rs.getDate("effective_from");  if (ef != null) e.setEffectiveFrom(ef.toLocalDate());
        var eu = rs.getDate("effective_until"); if (eu != null) e.setEffectiveUntil(eu.toLocalDate());
        e.setActive(rs.getBoolean("is_active"));
        Timestamp ca = rs.getTimestamp("created_at"); if (ca != null) e.setCreatedAt(ca.toInstant());
        Timestamp ua = rs.getTimestamp("updated_at"); if (ua != null) e.setUpdatedAt(ua.toInstant());
        return e;
    }
}
