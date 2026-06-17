package com.akt.institute.attendance.repository;

import com.akt.institute.attendance.dto.AttendanceSummaryResponse;
import com.akt.institute.attendance.dto.StudentAttendanceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Repository
@RequiredArgsConstructor
public class AttendanceJdbcDao implements AttendanceDao {

    private final NamedParameterJdbcTemplate jdbc;

    @Override
    public List<StudentAttendanceResponse> findBySession(Long sessionId, Long instituteId) {
        return jdbc.query("""
                SELECT sa.id, sa.class_session_id, cs.session_date, cs.subject,
                       b.name batch_name, sa.student_id,
                       CONCAT(s.first_name,' ',COALESCE(s.last_name,'')) student_name,
                       s.student_number, sa.status, sa.remarks,
                       CONCAT(u.first_name,' ',COALESCE(u.last_name,'')) marked_by_name,
                       sa.marked_at
                FROM student_attendance sa
                JOIN class_sessions cs ON cs.id = sa.class_session_id
                JOIN batches        b  ON b.id  = sa.batch_id
                JOIN students       s  ON s.id  = sa.student_id
                JOIN users          u  ON u.id  = sa.marked_by
                WHERE sa.class_session_id=:sid AND sa.institute_id=:iid
                ORDER BY s.first_name, s.last_name
                """,
                Map.of("sid", sessionId, "iid", instituteId),
                (rs, row) -> mapRecord(rs));
    }

    @Override
    public void upsert(Long sessionId, Long batchId, Long studentId, Long instituteId,
                       String status, String remarks, Long markedBy) {
        jdbc.update("""
                INSERT INTO student_attendance
                    (institute_id, class_session_id, batch_id, student_id, status, remarks, marked_by)
                VALUES (:iid,:sid,:bid,:stid,:status,:remarks,:mb)
                ON CONFLICT (class_session_id, student_id)
                DO UPDATE SET status=EXCLUDED.status, remarks=EXCLUDED.remarks,
                              marked_by=EXCLUDED.marked_by, marked_at=CURRENT_TIMESTAMP,
                              updated_at=CURRENT_TIMESTAMP
                """,
                new MapSqlParameterSource()
                        .addValue("iid",     instituteId)
                        .addValue("sid",     sessionId)
                        .addValue("bid",     batchId)
                        .addValue("stid",    studentId)
                        .addValue("status",  status)
                        .addValue("remarks", remarks)
                        .addValue("mb",      markedBy));
    }

    @Override
    public List<StudentAttendanceResponse> findByStudent(Long studentId, Long instituteId,
                                                          LocalDate from, LocalDate to) {
        var sql = new StringBuilder("""
                SELECT sa.id, sa.class_session_id, cs.session_date, cs.subject,
                       b.name batch_name, sa.student_id,
                       CONCAT(s.first_name,' ',COALESCE(s.last_name,'')) student_name,
                       s.student_number, sa.status, sa.remarks,
                       CONCAT(u.first_name,' ',COALESCE(u.last_name,'')) marked_by_name,
                       sa.marked_at
                FROM student_attendance sa
                JOIN class_sessions cs ON cs.id = sa.class_session_id
                JOIN batches        b  ON b.id  = sa.batch_id
                JOIN students       s  ON s.id  = sa.student_id
                JOIN users          u  ON u.id  = sa.marked_by
                WHERE sa.student_id=:stid AND sa.institute_id=:iid
                """);
        var p = new MapSqlParameterSource("stid", studentId).addValue("iid", instituteId);
        if (from != null) { sql.append(" AND cs.session_date>=:from"); p.addValue("from", from); }
        if (to   != null) { sql.append(" AND cs.session_date<=:to");   p.addValue("to",   to);   }
        sql.append(" ORDER BY cs.session_date DESC");
        return jdbc.query(sql.toString(), p, (rs, row) -> mapRecord(rs));
    }

    @Override
    public List<AttendanceSummaryResponse> summaryByBatch(Long batchId, Long instituteId) {
        return jdbc.query("""
                SELECT sa.student_id,
                       CONCAT(s.first_name,' ',COALESCE(s.last_name,'')) student_name,
                       s.student_number,
                       COUNT(*) total_sessions,
                       SUM(CASE WHEN sa.status='PRESENT' THEN 1 ELSE 0 END) present,
                       SUM(CASE WHEN sa.status='ABSENT'  THEN 1 ELSE 0 END) absent,
                       SUM(CASE WHEN sa.status='LATE'    THEN 1 ELSE 0 END) late,
                       SUM(CASE WHEN sa.status='HOLIDAY' THEN 1 ELSE 0 END) holiday
                FROM student_attendance sa
                JOIN students s ON s.id = sa.student_id
                WHERE sa.batch_id=:bid AND sa.institute_id=:iid
                GROUP BY sa.student_id, s.first_name, s.last_name, s.student_number
                ORDER BY s.first_name
                """,
                Map.of("bid", batchId, "iid", instituteId),
                (rs, row) -> buildSummary(rs));
    }

    @Override
    public AttendanceSummaryResponse summaryForStudent(Long studentId, Long instituteId) {
        var rows = jdbc.query("""
                SELECT sa.student_id,
                       CONCAT(s.first_name,' ',COALESCE(s.last_name,'')) student_name,
                       s.student_number,
                       COUNT(*) total_sessions,
                       SUM(CASE WHEN sa.status='PRESENT' THEN 1 ELSE 0 END) present,
                       SUM(CASE WHEN sa.status='ABSENT'  THEN 1 ELSE 0 END) absent,
                       SUM(CASE WHEN sa.status='LATE'    THEN 1 ELSE 0 END) late,
                       SUM(CASE WHEN sa.status='HOLIDAY' THEN 1 ELSE 0 END) holiday
                FROM student_attendance sa
                JOIN students s ON s.id = sa.student_id
                WHERE sa.student_id=:stid AND sa.institute_id=:iid
                GROUP BY sa.student_id, s.first_name, s.last_name, s.student_number
                """,
                Map.of("stid", studentId, "iid", instituteId),
                (rs, row) -> buildSummary(rs));
        return rows.isEmpty()
                ? AttendanceSummaryResponse.builder().studentId(studentId).build()
                : rows.get(0);
    }

    private static StudentAttendanceResponse mapRecord(ResultSet rs) throws SQLException {
        var b = StudentAttendanceResponse.builder()
                .id(rs.getLong("id"))
                .classSessionId(rs.getLong("class_session_id"))
                .subject(rs.getString("subject"))
                .batchName(rs.getString("batch_name"))
                .studentId(rs.getLong("student_id"))
                .studentName(rs.getString("student_name"))
                .studentNumber(rs.getString("student_number"))
                .status(rs.getString("status"))
                .remarks(rs.getString("remarks"))
                .markedByName(rs.getString("marked_by_name"));
        var dt = rs.getDate("session_date"); if (dt != null) b.sessionDate(dt.toLocalDate());
        var ma = rs.getTimestamp("marked_at"); if (ma != null) b.markedAt(ma.toInstant());
        return b.build();
    }

    private static AttendanceSummaryResponse buildSummary(ResultSet rs) throws SQLException {
        int total   = rs.getInt("total_sessions");
        int present = rs.getInt("present");
        int late    = rs.getInt("late");
        int holiday = rs.getInt("holiday");
        int absent  = rs.getInt("absent");
        int effective = total - holiday;
        double pct  = effective > 0 ? (double)(present + late) / effective * 100 : 0;
        return AttendanceSummaryResponse.builder()
                .studentId(rs.getLong("student_id"))
                .studentName(rs.getString("student_name"))
                .studentNumber(rs.getString("student_number"))
                .totalSessions(total)
                .present(present).absent(absent).late(late).holiday(holiday)
                .attendancePercent(Math.round(pct * 10.0) / 10.0)
                .build();
    }
}
