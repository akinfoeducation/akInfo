package com.akt.institute.shared.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class SequenceCounterJdbcDao implements SequenceCounterDao {

    private final NamedParameterJdbcTemplate jdbc;

    /**
     * PostgreSQL atomic upsert: inserts the counter row with value 1 on first call,
     * or increments existing value by 1.  RETURNING guarantees we get the new value
     * in a single round-trip without needing a separate SELECT … FOR UPDATE.
     */
    @Override
    public long incrementAndGet(Long instituteId, String sequenceType, int year) {
        String sql = """
                INSERT INTO sequence_counters (institute_id, sequence_type, year, current_value)
                VALUES (:instituteId, :sequenceType, :year, 1)
                ON CONFLICT (institute_id, sequence_type, year)
                DO UPDATE SET current_value = sequence_counters.current_value + 1
                RETURNING current_value
                """;
        var params = new MapSqlParameterSource()
                .addValue("instituteId", instituteId)
                .addValue("sequenceType", sequenceType)
                .addValue("year", year);
        Long value = jdbc.queryForObject(sql, params, Long.class);
        return value == null ? 1L : value;
    }
}
