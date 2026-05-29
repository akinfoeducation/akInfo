package com.akt.institute.shared.util;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;

/**
 * Utility for parsing flexible datetime strings from the frontend.
 *
 * HTML {@code <input type="datetime-local">} sends {@code "yyyy-MM-dd'T'HH:mm"}
 * (no seconds, no timezone). This parser handles that format as well as full
 * ISO-8601 instants like {@code "2026-05-30T14:55:00Z"}.
 */
public final class DateTimeUtil {

    private static final DateTimeFormatter FLEXIBLE = new DateTimeFormatterBuilder()
        .append(DateTimeFormatter.ISO_LOCAL_DATE)
        .appendLiteral('T')
        .appendValue(ChronoField.HOUR_OF_DAY, 2)
        .appendLiteral(':')
        .appendValue(ChronoField.MINUTE_OF_HOUR, 2)
        .optionalStart().appendLiteral(':').appendValue(ChronoField.SECOND_OF_MINUTE, 2).optionalEnd()
        .optionalStart().appendFraction(ChronoField.NANO_OF_SECOND, 0, 9, true).optionalEnd()
        .optionalStart().appendOffsetId().optionalEnd()
        .toFormatter();

    private DateTimeUtil() {}

    /**
     * Parses a datetime string sent from the browser.
     * Accepts:
     * <ul>
     *   <li>{@code "2026-05-30T14:55"}         — datetime-local (no tz → treated as UTC)</li>
     *   <li>{@code "2026-05-30T14:55:00"}       — with seconds, no tz</li>
     *   <li>{@code "2026-05-30T14:55:00Z"}      — full ISO-8601</li>
     *   <li>{@code "2026-05-30T14:55:00+05:30"} — with offset</li>
     * </ul>
     *
     * @return {@code null} if the input is null or blank
     */
    public static Instant parseFlexible(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            // Try full Instant parse first (handles 'Z' suffix and offsets)
            return Instant.parse(value.length() == 16 ? value + ":00Z"
                               : value.endsWith("Z") || value.contains("+") ? value
                               : value + "Z");
        } catch (Exception e) {
            // Fallback: parse as local datetime, assume UTC
            return LocalDateTime.parse(value.replace("Z", ""), DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                                .toInstant(ZoneOffset.UTC);
        }
    }
}
