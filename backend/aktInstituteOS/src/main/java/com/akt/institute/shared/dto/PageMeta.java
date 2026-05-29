package com.akt.institute.shared.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PageMeta {

    private final int page;
    private final int size;
    private final long total;
    private final int totalPages;
    private final boolean hasNext;
    private final boolean hasPrevious;
}
