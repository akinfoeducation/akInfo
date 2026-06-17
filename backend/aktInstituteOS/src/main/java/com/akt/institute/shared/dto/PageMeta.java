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

    public static PageMeta of(int page, int size, long total) {
        int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 0;
        return PageMeta.builder()
                .page(page).size(size).total(total)
                .totalPages(totalPages)
                .hasNext(page < totalPages - 1)
                .hasPrevious(page > 0)
                .build();
    }
}
