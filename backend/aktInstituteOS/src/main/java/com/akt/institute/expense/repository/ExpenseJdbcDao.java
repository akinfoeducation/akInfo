package com.akt.institute.expense.repository;

import com.akt.institute.expense.domain.Expense;
import com.akt.institute.shared.util.AuditUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ExpenseJdbcDao implements ExpenseDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_SQL = """
        SELECT e.id, e.uuid, e.institute_id, e.expense_number, e.category, e.description,
               e.amount, e.expense_date, e.paid_to, e.payment_mode, e.reference_number,
               e.notes, e.created_at, e.updated_at, e.deleted_at, e.created_by, e.updated_by,
               CONCAT(u.first_name, CASE WHEN u.last_name IS NOT NULL THEN ' ' || u.last_name ELSE '' END) AS created_by_name
        FROM expenses e
        LEFT JOIN users u ON u.id = e.created_by
        """;

    @Override
    public Expense save(Expense e) { return e.getId() == null ? insert(e) : update(e); }

    @Override
    public Optional<Expense> findByIdAndInstituteId(Long id, Long instituteId) {
        var sql = SELECT_SQL + " WHERE e.id = :id AND e.institute_id = :iid AND e.deleted_at IS NULL";
        var rows = jdbc.query(sql,
            new MapSqlParameterSource().addValue("id", id).addValue("iid", instituteId),
            ExpenseJdbcDao::mapRow);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public List<Expense> findWithFilters(Long instituteId, String category,
                                          LocalDate from, LocalDate to, String q,
                                          int page, int size, String sort, String dir) {
        var sql = new StringBuilder(SELECT_SQL + " WHERE e.deleted_at IS NULL AND e.institute_id = :iid");
        var params = new MapSqlParameterSource("iid", instituteId);
        applyFilters(sql, params, category, from, to, q);
        String safeSort = List.of("expense_date","amount","category","created_at").contains(sort) ? sort : "expense_date";
        String safeDir  = "asc".equalsIgnoreCase(dir) ? "ASC" : "DESC";
        sql.append(" ORDER BY e.").append(safeSort).append(" ").append(safeDir);
        sql.append(" LIMIT :size OFFSET :offset");
        params.addValue("size", size).addValue("offset", (long) page * size);
        return jdbc.query(sql.toString(), params, ExpenseJdbcDao::mapRow);
    }

    @Override
    public long countWithFilters(Long instituteId, String category,
                                  LocalDate from, LocalDate to, String q) {
        var sql = new StringBuilder("SELECT COUNT(1) FROM expenses e WHERE e.deleted_at IS NULL AND e.institute_id = :iid");
        var params = new MapSqlParameterSource("iid", instituteId);
        applyFilters(sql, params, category, from, to, q);
        Long v = jdbc.queryForObject(sql.toString(), params, Long.class);
        return v == null ? 0 : v;
    }

    @Override
    public BigDecimal sumByInstituteAndDateRange(Long instituteId, LocalDate from, LocalDate to) {
        BigDecimal v = jdbc.queryForObject(
            "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE institute_id = :iid AND deleted_at IS NULL AND expense_date >= :from AND expense_date <= :to",
            new MapSqlParameterSource().addValue("iid", instituteId)
                .addValue("from", Date.valueOf(from)).addValue("to", Date.valueOf(to)),
            BigDecimal.class);
        return v == null ? BigDecimal.ZERO : v;
    }

    // ── private ──────────────────────────────────────────────────────────────

    private static void applyFilters(StringBuilder sql, MapSqlParameterSource params,
                                      String category, LocalDate from, LocalDate to, String q) {
        if (category != null && !category.isBlank()) {
            sql.append(" AND e.category = :category");
            params.addValue("category", category.toUpperCase());
        }
        if (from != null) { sql.append(" AND e.expense_date >= :from"); params.addValue("from", Date.valueOf(from)); }
        if (to   != null) { sql.append(" AND e.expense_date <= :to");   params.addValue("to",   Date.valueOf(to));   }
        if (q != null && !q.isBlank()) {
            sql.append(" AND (e.description ILIKE :q OR e.paid_to ILIKE :q OR e.expense_number ILIKE :q)");
            params.addValue("q", "%" + q.trim() + "%");
        }
    }

    private Expense insert(Expense e) {
        String sql = """
            INSERT INTO expenses (uuid, institute_id, expense_number, category, description,
                amount, expense_date, paid_to, payment_mode, reference_number, notes,
                created_at, updated_at, created_by, updated_by)
            VALUES (:uuid, :iid, :num, :cat, :desc,
                :amount, :date, :paidTo, :mode, :ref, :notes,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, :actor, :actor)
            """;
        Long actor = AuditUtil.getCurrentUserId();
        var params = new MapSqlParameterSource()
            .addValue("uuid",   e.getUuid())
            .addValue("iid",    e.getInstituteId())
            .addValue("num",    e.getExpenseNumber())
            .addValue("cat",    e.getCategory())
            .addValue("desc",   e.getDescription())
            .addValue("amount", e.getAmount())
            .addValue("date",   e.getExpenseDate() != null ? Date.valueOf(e.getExpenseDate()) : Date.valueOf(LocalDate.now()))
            .addValue("paidTo", e.getPaidTo())
            .addValue("mode",   e.getPaymentMode() != null ? e.getPaymentMode() : "CASH")
            .addValue("ref",    e.getReferenceNumber())
            .addValue("notes",  e.getNotes())
            .addValue("actor",  actor);
        var kh = new GeneratedKeyHolder();
        jdbc.update(sql, params, kh, new String[]{"id"});
        e.setId(Objects.requireNonNull(kh.getKeyAs(Long.class)));
        return e;
    }

    private Expense update(Expense e) {
        jdbc.update(
            "UPDATE expenses SET deleted_at = :deletedAt, updated_at = CURRENT_TIMESTAMP, updated_by = :actor WHERE id = :id",
            new MapSqlParameterSource()
                .addValue("deletedAt", e.getDeletedAt() != null ? Timestamp.from(e.getDeletedAt()) : null)
                .addValue("actor", AuditUtil.getCurrentUserId())
                .addValue("id", e.getId()));
        return e;
    }

    static Expense mapRow(ResultSet rs, int rn) throws SQLException {
        Expense e = new Expense();
        e.setId(rs.getLong("id"));
        e.setUuid(rs.getString("uuid"));
        e.setInstituteId(rs.getLong("institute_id"));
        e.setExpenseNumber(rs.getString("expense_number"));
        e.setCategory(rs.getString("category"));
        e.setDescription(rs.getString("description"));
        e.setAmount(rs.getBigDecimal("amount"));
        Date d = rs.getDate("expense_date");
        if (d != null) e.setExpenseDate(d.toLocalDate());
        e.setPaidTo(rs.getString("paid_to"));
        e.setPaymentMode(rs.getString("payment_mode"));
        e.setReferenceNumber(rs.getString("reference_number"));
        e.setNotes(rs.getString("notes"));
        e.setCreatedByName(rs.getString("created_by_name"));
        Timestamp ca = rs.getTimestamp("created_at");
        if (ca != null) e.setCreatedAt(ca.toInstant());
        Timestamp da = rs.getTimestamp("deleted_at");
        if (da != null) e.setDeletedAt(da.toInstant());
        return e;
    }
}
