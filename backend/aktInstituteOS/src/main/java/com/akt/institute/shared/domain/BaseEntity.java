package com.akt.institute.shared.domain;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
public abstract class BaseEntity {

    private Long id;
    private Instant createdAt;
    private Instant updatedAt;
    private Long createdBy;
    private Long updatedBy;
    private Instant deletedAt;

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
