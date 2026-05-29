package com.akt.institute.shared.util;

import com.akt.institute.shared.repository.SequenceCounterDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Atomic sequence number generator.
 * Uses PostgreSQL INSERT … ON CONFLICT DO UPDATE to increment the counter
 * in a single atomic round-trip — no explicit lock required.
 * Runs in REQUIRES_NEW so the counter commit is independent of the caller's transaction.
 */
@Service
@RequiredArgsConstructor
public class SequenceGenerator {

    private final SequenceCounterDao sequenceCounterDao;

    public static final String STUDENT   = "STUDENT";
    public static final String ADMISSION = "ADMISSION";
    public static final String RECEIPT   = "RECEIPT";
    public static final String EMPLOYEE  = "EMPLOYEE";
    public static final String EXPENSE   = "EXPENSE";

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String next(Long instituteId, String sequenceType) {
        int year = LocalDate.now().getYear();
        long nextVal = sequenceCounterDao.incrementAndGet(instituteId, sequenceType, year);
        return String.format("%s-%d-%06d", prefixFor(sequenceType), year, nextVal);
    }

    private String prefixFor(String type) {
        return switch (type) {
            case STUDENT   -> "STD";
            case ADMISSION -> "ADM";
            case RECEIPT   -> "RCP";
            case EMPLOYEE  -> "EMP";
            default        -> type.substring(0, Math.min(3, type.length())).toUpperCase();
        };
    }
}
