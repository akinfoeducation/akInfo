package com.akt.institute.student.event;

/**
 * Published after a student is created, updated, or deleted.
 * Handled by StudentSearchSyncService after transaction commits.
 */
public record StudentIndexEvent(Long studentId, Operation operation) {

    public enum Operation {
        UPSERT,  // create or update
        DELETE
    }
}
