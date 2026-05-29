package com.akt.institute.shared.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final String message;
    private final T data;
    private final PageMeta meta;
    private final List<FieldError> errors;
    private final String errorCode;
    @Builder.Default
    private final String requestId = UUID.randomUUID().toString();
    @Builder.Default
    private final Instant timestamp = Instant.now();

    public static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder()
            .success(true)
            .message("OK")
            .data(data)
            .build();
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return ApiResponse.<T>builder()
            .success(true)
            .message(message)
            .data(data)
            .build();
    }

    public static <T> ApiResponse<T> created(String message, T data) {
        return ApiResponse.<T>builder()
            .success(true)
            .message(message)
            .data(data)
            .build();
    }

    public static ApiResponse<Void> message(String message) {
        return ApiResponse.<Void>builder()
            .success(true)
            .message(message)
            .build();
    }

    public static <T> ApiResponse<T> paged(T data, PageMeta meta) {
        return ApiResponse.<T>builder()
            .success(true)
            .message("OK")
            .data(data)
            .meta(meta)
            .build();
    }

    public static <T> ApiResponse<T> error(String message, String errorCode) {
        return ApiResponse.<T>builder()
            .success(false)
            .message(message)
            .errorCode(errorCode)
            .build();
    }

    public static <T> ApiResponse<T> validationError(String message, List<FieldError> errors) {
        return ApiResponse.<T>builder()
            .success(false)
            .message(message)
            .errorCode("VALIDATION_FAILED")
            .errors(errors)
            .build();
    }

    public record FieldError(String field, String message) {}
}
