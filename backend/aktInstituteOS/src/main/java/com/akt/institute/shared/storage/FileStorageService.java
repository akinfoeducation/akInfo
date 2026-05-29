package com.akt.institute.shared.storage;

import com.akt.institute.shared.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp", "application/pdf"
    );

    private static final long MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.upload.base-url:/uploads}")
    private String baseUrl;

    public StoredFile store(MultipartFile file, String category) {
        validate(file);

        String originalName = StringUtils.cleanPath(file.getOriginalFilename() != null
            ? file.getOriginalFilename() : "file");
        String extension = originalName.contains(".")
            ? originalName.substring(originalName.lastIndexOf('.'))
            : "";
        String storedName = UUID.randomUUID() + extension;

        Path targetDir = Paths.get(uploadDir, category);
        try {
            Files.createDirectories(targetDir);
            Path target = targetDir.resolve(storedName);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            log.debug("Stored file: {}", target);
        } catch (IOException e) {
            throw new BusinessException("Failed to store file: " + e.getMessage(), "FILE_STORAGE_ERROR", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        String url = baseUrl + "/" + category + "/" + storedName;
        return new StoredFile(storedName, originalName, url, file.getSize(), file.getContentType());
    }

    public void delete(String fileUrl) {
        if (fileUrl == null || !fileUrl.startsWith(baseUrl)) return;
        String relativePath = fileUrl.substring(baseUrl.length());
        Path target = Paths.get(uploadDir + relativePath);
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            log.warn("Could not delete file {}: {}", target, e.getMessage());
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("File is empty", "EMPTY_FILE", HttpStatus.BAD_REQUEST);
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new BusinessException("File exceeds maximum size of 10 MB", "FILE_TOO_LARGE", HttpStatus.BAD_REQUEST);
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new BusinessException(
                "File type not allowed. Allowed: JPEG, PNG, WebP, PDF",
                "INVALID_FILE_TYPE", HttpStatus.BAD_REQUEST
            );
        }
    }

    public record StoredFile(String storedName, String originalName, String url, long sizeBytes, String mimeType) {}
}
