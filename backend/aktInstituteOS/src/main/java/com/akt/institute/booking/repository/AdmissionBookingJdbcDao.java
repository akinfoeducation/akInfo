package com.akt.institute.booking.repository;

import com.akt.institute.booking.domain.AdmissionBooking;
import com.akt.institute.booking.domain.BookingStatus;
import com.akt.institute.shared.util.AuditUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class AdmissionBookingJdbcDao implements AdmissionBookingDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String COLS = """
            ab.id, ab.uuid, ab.institute_id, ab.lead_id, ab.batch_id,
            b.name AS batch_name,
            l.first_name AS lead_first_name, l.last_name AS lead_last_name, l.phone AS lead_phone,
            ab.payment_amount, ab.payment_proof_url, ab.payment_proof_uploaded_at,
            ab.booking_status, ab.payment_verified_by, ab.payment_verified_at,
            ab.notes, ab.created_by, ab.updated_by, ab.created_at, ab.updated_at,
            ab.booking_type, ab.is_active, ab.cancelled_at, ab.cancelled_by, ab.cancel_reason
            """;

    /** Shared FROM clause — joins batch (name) and lead (applicant name/phone) for display. */
    private static final String FROM_JOINS =
        " FROM admission_bookings ab" +
        " JOIN batches b ON b.id = ab.batch_id" +
        " LEFT JOIN leads l ON l.id = ab.lead_id";

    private static final RowMapper<AdmissionBooking> ROW_MAPPER = AdmissionBookingJdbcDao::mapRow;

    @Override
    public AdmissionBooking save(AdmissionBooking b) {
        return b.getId() == null ? insert(b) : update(b);
    }

    @Override
    public Optional<AdmissionBooking> findByIdAndInstituteId(Long id, Long instituteId) {
        List<AdmissionBooking> rows = jdbc.query(
            "SELECT " + COLS + FROM_JOINS +
            " WHERE ab.id = :id AND ab.institute_id = :iid",
            new MapSqlParameterSource().addValue("id", id).addValue("iid", instituteId),
            ROW_MAPPER);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    /** Returns the active booking for a lead (is_active = true). */
    @Override
    public Optional<AdmissionBooking> findByLeadId(Long leadId, Long instituteId) {
        return findActiveByLeadId(leadId, instituteId);
    }

    @Override
    public Optional<AdmissionBooking> findActiveByLeadId(Long leadId, Long instituteId) {
        List<AdmissionBooking> rows = jdbc.query(
            "SELECT " + COLS + FROM_JOINS +
            " WHERE ab.lead_id = :leadId AND ab.institute_id = :iid AND ab.is_active = TRUE",
            new MapSqlParameterSource().addValue("leadId", leadId).addValue("iid", instituteId),
            ROW_MAPPER);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public List<AdmissionBooking> findAllByLeadId(Long leadId, Long instituteId) {
        return jdbc.query(
            "SELECT " + COLS + FROM_JOINS +
            " WHERE ab.lead_id = :leadId AND ab.institute_id = :iid ORDER BY ab.created_at DESC",
            new MapSqlParameterSource().addValue("leadId", leadId).addValue("iid", instituteId),
            ROW_MAPPER);
    }

    @Override
    public List<AdmissionBooking> findByInstituteId(Long instituteId, String status, int page, int size) {
        var sql = new StringBuilder("SELECT " + COLS + FROM_JOINS +
            " WHERE ab.institute_id = :iid AND ab.is_active = TRUE");
        var params = new MapSqlParameterSource("iid", instituteId);
        if (status != null && !status.isBlank()) { sql.append(" AND ab.booking_status = :status"); params.addValue("status", status); }
        sql.append(" ORDER BY ab.created_at DESC LIMIT :size OFFSET :offset");
        params.addValue("size", size).addValue("offset", (long) page * size);
        return jdbc.query(sql.toString(), params, ROW_MAPPER);
    }

    @Override
    public long countByInstituteId(Long instituteId, String status) {
        var sql = new StringBuilder("SELECT COUNT(1) FROM admission_bookings ab WHERE ab.institute_id = :iid AND ab.is_active = TRUE");
        var params = new MapSqlParameterSource("iid", instituteId);
        if (status != null && !status.isBlank()) { sql.append(" AND ab.booking_status = :status"); params.addValue("status", status); }
        Long count = jdbc.queryForObject(sql.toString(), params, Long.class);
        return count == null ? 0 : count;
    }

    @Override
    public void updatePaymentProof(Long id, String proofUrl, Long updatedBy) {
        jdbc.update(
            "UPDATE admission_bookings SET payment_proof_url = :url, payment_proof_uploaded_at = CURRENT_TIMESTAMP," +
            " updated_by = :ub, updated_at = CURRENT_TIMESTAMP WHERE id = :id",
            new MapSqlParameterSource().addValue("url", proofUrl).addValue("ub", updatedBy).addValue("id", id)
        );
    }

    @Override
    public boolean deductSeat(Long batchId) {
        // Atomic CAS update — only succeeds if available_seats > 0
        int updated = jdbc.update(
            "UPDATE batches SET available_seats = available_seats - 1, updated_at = CURRENT_TIMESTAMP" +
            " WHERE id = :batchId AND available_seats > 0",
            new MapSqlParameterSource("batchId", batchId)
        );
        return updated > 0;
    }

    @Override
    public boolean restoreSeat(Long batchId) {
        int updated = jdbc.update(
            "UPDATE batches SET available_seats = available_seats + 1, updated_at = CURRENT_TIMESTAMP" +
            " WHERE id = :batchId",
            new MapSqlParameterSource("batchId", batchId)
        );
        return updated > 0;
    }

    @Override
    public boolean confirmAtomically(Long bookingId, Long actorId) {
        // Atomic confirm: transitions PAYMENT_PENDING → BOOKING_CONFIRMED in a single statement.
        // If two admins click verify simultaneously, only one will match booking_status = 'PAYMENT_PENDING'.
        int updated = jdbc.update(
            """
            UPDATE admission_bookings
               SET booking_status       = 'BOOKING_CONFIRMED',
                   payment_verified_by  = :actorId,
                   payment_verified_at  = CURRENT_TIMESTAMP,
                   updated_at           = CURRENT_TIMESTAMP
             WHERE id             = :id
               AND booking_status = 'PAYMENT_PENDING'
               AND is_active      = TRUE
            """,
            new MapSqlParameterSource().addValue("id", bookingId).addValue("actorId", actorId)
        );
        return updated > 0;
    }

    @Override
    public boolean cancelBooking(Long bookingId, Long cancelledBy, String cancelReason) {
        int updated = jdbc.update(
            """
            UPDATE admission_bookings
               SET is_active      = FALSE,
                   booking_status = 'CANCELLED',
                   cancelled_at   = CURRENT_TIMESTAMP,
                   cancelled_by   = :cancelledBy,
                   cancel_reason  = :cancelReason,
                   updated_at     = CURRENT_TIMESTAMP
             WHERE id        = :id
               AND is_active = TRUE
            """,
            new MapSqlParameterSource()
                .addValue("id",           bookingId)
                .addValue("cancelledBy",  cancelledBy)
                .addValue("cancelReason", cancelReason)
        );
        return updated > 0;
    }

    private AdmissionBooking insert(AdmissionBooking b) {
        Long actor = AuditUtil.getCurrentUserId();
        String bookingType = (b.getBookingType() == null || b.getBookingType().isBlank())
            ? "ADMISSION_CLOSING" : b.getBookingType();
        String sql = """
                INSERT INTO admission_bookings
                    (uuid, institute_id, lead_id, batch_id, payment_amount, booking_status,
                     notes, booking_type, is_active, created_by, updated_by)
                VALUES
                    (:uuid, :iid, :leadId, :batchId, :amount, :status,
                     :notes, :bookingType, TRUE, :actor, :actor)
                """;
        var params = new MapSqlParameterSource()
            .addValue("uuid",        b.getUuid())
            .addValue("iid",         b.getInstituteId())
            .addValue("leadId",      b.getLeadId())
            .addValue("batchId",     b.getBatchId())
            .addValue("amount",      b.getPaymentAmount())
            .addValue("status",      b.getBookingStatus().name())
            .addValue("notes",       b.getNotes())
            .addValue("bookingType", bookingType)
            .addValue("actor",       actor);
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(sql, params, keyHolder, new String[]{"id"});
        b.setId(Objects.requireNonNull(keyHolder.getKeyAs(Long.class)));
        b.setCreatedBy(actor);
        b.setBookingType(bookingType);
        return b;
    }

    private AdmissionBooking update(AdmissionBooking b) {
        Long actor = AuditUtil.getCurrentUserId();
        jdbc.update(
            """
            UPDATE admission_bookings SET
                booking_status = :status, payment_verified_by = :verifiedBy,
                payment_verified_at = :verifiedAt, notes = :notes,
                updated_by = :actor, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            """,
            new MapSqlParameterSource()
                .addValue("status",     b.getBookingStatus().name())
                .addValue("verifiedBy", b.getPaymentVerifiedBy())
                .addValue("verifiedAt", toTs(b.getPaymentVerifiedAt()))
                .addValue("notes",      b.getNotes())
                .addValue("actor",      actor)
                .addValue("id",         b.getId())
        );
        return b;
    }

    static AdmissionBooking mapRow(ResultSet rs, int n) throws SQLException {
        AdmissionBooking b = new AdmissionBooking();
        b.setId(rs.getLong("id"));
        b.setUuid(rs.getString("uuid"));
        b.setInstituteId(rs.getLong("institute_id"));
        b.setLeadId(rs.getLong("lead_id"));
        b.setBatchId(rs.getLong("batch_id"));
        BigDecimal amt = rs.getBigDecimal("payment_amount"); if (!rs.wasNull()) b.setPaymentAmount(amt);
        b.setPaymentProofUrl(rs.getString("payment_proof_url"));
        b.setPaymentProofUploadedAt(toInstant(rs.getTimestamp("payment_proof_uploaded_at")));
        String status = rs.getString("booking_status");
        if (status != null) b.setBookingStatus(BookingStatus.valueOf(status));
        long pvb = rs.getLong("payment_verified_by"); if (!rs.wasNull()) b.setPaymentVerifiedBy(pvb);
        b.setPaymentVerifiedAt(toInstant(rs.getTimestamp("payment_verified_at")));
        b.setNotes(rs.getString("notes"));
        long cb = rs.getLong("created_by"); if (!rs.wasNull()) b.setCreatedBy(cb);
        long ub = rs.getLong("updated_by"); if (!rs.wasNull()) b.setUpdatedBy(ub);
        b.setCreatedAt(toInstant(rs.getTimestamp("created_at")));
        b.setUpdatedAt(toInstant(rs.getTimestamp("updated_at")));
        // Fix 3 fields
        String bt = rs.getString("booking_type");
        b.setBookingType(bt != null ? bt : "ADMISSION_CLOSING");
        b.setActive(rs.getBoolean("is_active"));
        b.setCancelledAt(toInstant(rs.getTimestamp("cancelled_at")));
        long cancelledBy = rs.getLong("cancelled_by"); if (!rs.wasNull()) b.setCancelledBy(cancelledBy);
        b.setCancelReason(rs.getString("cancel_reason"));
        // Joined applicant details (LEFT JOIN — may be null if the lead was deleted)
        String lf = rs.getString("lead_first_name");
        String ll = rs.getString("lead_last_name");
        String full = ((lf == null ? "" : lf) + " " + (ll == null ? "" : ll)).trim();
        b.setLeadName(full.isEmpty() ? null : full);
        b.setLeadPhone(rs.getString("lead_phone"));
        return b;
    }

    private static Instant toInstant(Timestamp ts) { return ts == null ? null : ts.toInstant(); }
    private static Timestamp toTs(Instant i)        { return i  == null ? null : Timestamp.from(i); }
}
