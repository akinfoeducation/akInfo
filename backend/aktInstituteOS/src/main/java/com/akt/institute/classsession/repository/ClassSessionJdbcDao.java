package com.akt.institute.classsession.repository;

import com.akt.institute.classsession.domain.ClassSession;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ClassSessionJdbcDao implements ClassSessionDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String BASE = """
            SELECT cs.id, cs.uuid, cs.institute_id, cs.batch_id,
                   b.name batch_name, cs.timetable_id,
                   cs.faculty_user_id,
                   CONCAT(u.first_name,' ',COALESCE(u.last_name,'')) faculty_name,
                   cs.session_date, cs.start_time, cs.end_time, cs.subject,
                   cs.topic_covered, cs.session_notes, cs.homework_notes,
                   cs.status, cs.attendance_marked,
                   (SELECT COUNT(*) FROM student_attendance sa WHERE sa.class_session_id=cs.id AND sa.status='PRESENT') present_count,
                   (SELECT COUNT(*) FROM student_attendance sa WHERE sa.class_session_id=cs.id) total_students,
                   cs.created_at, cs.updated_at, cs.created_by, cs.updated_by
            FROM class_sessions cs
            LEFT JOIN batches b ON b.id = cs.batch_id
            LEFT JOIN users   u ON u.id = cs.faculty_user_id
            WHERE 1=1
            """;

    @Override
    public List<ClassSession> findAll(Long instituteId, Long batchId, Long facultyUserId,
                                      LocalDate from, LocalDate to) {
        var sql = new StringBuilder(BASE + " AND cs.institute_id=:iid");
        var p   = new MapSqlParameterSource("iid", instituteId);
        if (batchId != null)       { sql.append(" AND cs.batch_id=:bid");           p.addValue("bid", batchId); }
        if (facultyUserId != null) { sql.append(" AND cs.faculty_user_id=:fid");    p.addValue("fid", facultyUserId); }
        if (from != null)          { sql.append(" AND cs.session_date>=:from");      p.addValue("from", from); }
        if (to   != null)          { sql.append(" AND cs.session_date<=:to");        p.addValue("to",   to); }
        sql.append(" ORDER BY cs.session_date DESC, cs.start_time");
        return jdbc.query(sql.toString(), p, (rs, row) -> mapRow(rs));
    }

    @Override
    public Optional<ClassSession> findById(Long id, Long instituteId) {
        var rows = jdbc.query(BASE + " AND cs.id=:id AND cs.institute_id=:iid",
                Map.of("id", id, "iid", instituteId), (rs, row) -> mapRow(rs));
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public ClassSession save(ClassSession s) {
        if (s.getId() != null) {
            jdbc.update("""
                    UPDATE class_sessions SET batch_id=:bid, faculty_user_id=:fid,
                        timetable_id=:tid, session_date=:dt, start_time=:st, end_time=:et,
                        subject=:sub, topic_covered=:tc, session_notes=:sn, homework_notes=:hn,
                        status=:status, updated_by=:ub, updated_at=CURRENT_TIMESTAMP
                    WHERE id=:id AND institute_id=:iid
                    """, buildParams(s));
        } else {
            var kh = new GeneratedKeyHolder();
            jdbc.update("""
                    INSERT INTO class_sessions
                        (institute_id,batch_id,faculty_user_id,timetable_id,session_date,
                         start_time,end_time,subject,topic_covered,session_notes,homework_notes,
                         status,attendance_marked,created_by,updated_by)
                    VALUES
                        (:iid,:bid,:fid,:tid,:dt,:st,:et,:sub,:tc,:sn,:hn,:status,FALSE,:cb,:ub)
                    """, new MapSqlParameterSource(buildParams(s).getValues()), kh, new String[]{"id"});
            s.setId(((Number) kh.getKeys().get("id")).longValue());
        }
        return findById(s.getId(), s.getInstituteId()).orElse(s);
    }

    @Override
    public void markAttendanceDone(Long id, Long instituteId) {
        jdbc.update("UPDATE class_sessions SET attendance_marked=TRUE, status='COMPLETED' WHERE id=:id AND institute_id=:iid",
                Map.of("id", id, "iid", instituteId));
    }

    private MapSqlParameterSource buildParams(ClassSession s) {
        return new MapSqlParameterSource()
                .addValue("id",     s.getId())
                .addValue("iid",    s.getInstituteId())
                .addValue("bid",    s.getBatchId())
                .addValue("fid",    s.getFacultyUserId())
                .addValue("tid",    s.getTimetableId())
                .addValue("dt",     s.getSessionDate())
                .addValue("st",     s.getStartTime() != null ? s.getStartTime().toString() : null)
                .addValue("et",     s.getEndTime()   != null ? s.getEndTime().toString()   : null)
                .addValue("sub",    s.getSubject())
                .addValue("tc",     s.getTopicCovered())
                .addValue("sn",     s.getSessionNotes())
                .addValue("hn",     s.getHomeworkNotes())
                .addValue("status", s.getStatus() != null ? s.getStatus() : "SCHEDULED")
                .addValue("cb",     s.getCreatedBy())
                .addValue("ub",     s.getUpdatedBy());
    }

    private static ClassSession mapRow(ResultSet rs) throws SQLException {
        ClassSession s = new ClassSession();
        s.setId(rs.getLong("id"));
        s.setUuid(rs.getString("uuid"));
        s.setInstituteId(rs.getLong("institute_id"));
        s.setBatchId(rs.getLong("batch_id"));
        s.setBatchName(rs.getString("batch_name"));
        long tid = rs.getLong("timetable_id"); if (!rs.wasNull()) s.setTimetableId(tid);
        long fid = rs.getLong("faculty_user_id"); if (!rs.wasNull()) s.setFacultyUserId(fid);
        s.setFacultyName(rs.getString("faculty_name"));
        var dt = rs.getDate("session_date");  if (dt != null) s.setSessionDate(dt.toLocalDate());
        var st = rs.getTime("start_time");    if (st != null) s.setStartTime(st.toLocalTime());
        var et = rs.getTime("end_time");      if (et != null) s.setEndTime(et.toLocalTime());
        s.setSubject(rs.getString("subject"));
        s.setTopicCovered(rs.getString("topic_covered"));
        s.setSessionNotes(rs.getString("session_notes"));
        s.setHomeworkNotes(rs.getString("homework_notes"));
        s.setStatus(rs.getString("status"));
        s.setAttendanceMarked(rs.getBoolean("attendance_marked"));
        s.setPresentCount(rs.getInt("present_count"));
        s.setTotalStudents(rs.getInt("total_students"));
        Timestamp ca = rs.getTimestamp("created_at"); if (ca != null) s.setCreatedAt(ca.toInstant());
        Timestamp ua = rs.getTimestamp("updated_at"); if (ua != null) s.setUpdatedAt(ua.toInstant());
        return s;
    }
}
