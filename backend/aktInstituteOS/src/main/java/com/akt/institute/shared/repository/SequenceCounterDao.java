package com.akt.institute.shared.repository;

public interface SequenceCounterDao {

    /**
     * Atomically increments the counter for (instituteId, type, year) and returns
     * the new value. Uses PostgreSQL INSERT ... ON CONFLICT DO UPDATE to eliminate
     * the need for a separate SELECT + pessimistic lock.
     */
    long incrementAndGet(Long instituteId, String sequenceType, int year);
}
