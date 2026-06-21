package com.akt.institute.shared.storage;

import com.akt.institute.shared.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp", "application/pdf"
    );

    private static final long MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

    private static final Map<String, String> EXT_CONTENT_TYPES = Map.of(
        ".jpg",  "image/jpeg",
        ".jpeg", "image/jpeg",
        ".png",  "image/png",
        ".webp", "image/webp",
        ".pdf",  "application/pdf"
    );

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.upload.base-url:/uploads}")
    private String baseUrl;

    // Sensitive files (payment proofs, ID documents) live here — physically OUTSIDE the
    // publicly-served `uploads` tree, so they can only be reached through an authenticated,
    // tenant-checked controller endpoint. Default-deny by location.
    @Value("${app.upload.private-dir:private-uploads}")
    private String privateDir;

    public StoredFile store(MultipartFile file, String category) {
        validate(file);
        String storedName = persist(file, Paths.get(uploadDir, category));
        String url = baseUrl + "/" + category + "/" + storedName;
        return new StoredFile(storedName, originalName(file), url, file.getSize(), file.getContentType());
    }

    /**
     * Store a sensitive file under the private (non-public) tree. The returned {@code url} is a
     * relative storage KEY (e.g. {@code bookings/proofs/<uuid>.jpg}) — NOT a browser-loadable URL.
     * Callers persist this key and serve the bytes through their own authenticated endpoint via
     * {@link #loadPrivate(String)}.
     */
    public StoredFile storePrivate(MultipartFile file, String category) {
        validate(file);
        String storedName = persist(file, Paths.get(privateDir, category));
        String key = category + "/" + storedName;
        return new StoredFile(storedName, originalName(file), key, file.getSize(), file.getContentType());
    }

    /**
     * Resolve a private storage key to a readable resource, guarding against path traversal and
     * confining reads to the private (with a legacy fallback to the public) upload root.
     */
    public LoadedFile loadPrivate(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            throw new BusinessException("File not found", "FILE_NOT_FOUND", HttpStatus.NOT_FOUND);
        }
        // Legacy values may carry a leading "/uploads/" or "/" prefix — strip to a bare key.
        String key = storageKey;
        if (key.startsWith(baseUrl + "/")) key = key.substring(baseUrl.length() + 1);
        while (key.startsWith("/")) key = key.substring(1);

        Path resolved = resolveWithin(Paths.get(privateDir), key);
        if (resolved == null || !Files.isRegularFile(resolved)) {
            // Legacy files written before the private-dir split still live under the public tree.
            resolved = resolveWithin(Paths.get(uploadDir), key);
        }
        if (resolved == null || !Files.isRegularFile(resolved)) {
            throw new BusinessException("File not found", "FILE_NOT_FOUND", HttpStatus.NOT_FOUND);
        }
        return new LoadedFile(new FileSystemResource(resolved), contentTypeFor(resolved), resolved.getFileName().toString());
    }

    /** Resolve {@code key} under {@code base}, returning null if it escapes the base (traversal). */
    private Path resolveWithin(Path base, String key) {
        Path root = base.toAbsolutePath().normalize();
        Path target = root.resolve(key).normalize();
        return target.startsWith(root) ? target : null;
    }

    private String contentTypeFor(Path path) {
        String name = path.getFileName().toString().toLowerCase();
        int dot = name.lastIndexOf('.');
        String ext = dot >= 0 ? name.substring(dot) : "";
        return EXT_CONTENT_TYPES.getOrDefault(ext, "application/octet-stream");
    }

    private String originalName(MultipartFile file) {
        return StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
    }

    private String persist(MultipartFile file, Path targetDir) {
        String originalName = originalName(file);
        String extension = originalName.contains(".")
            ? originalName.substring(originalName.lastIndexOf('.'))
            : "";
        String storedName = UUID.randomUUID() + extension;
        try {
            Files.createDirectories(targetDir);
            Path target = targetDir.resolve(storedName);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            log.debug("Stored file: {}", target);
        } catch (IOException e) {
            throw new BusinessException("Failed to store file: " + e.getMessage(), "FILE_STORAGE_ERROR", HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return storedName;
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

    /** A private file resolved for authenticated download. */
    public record LoadedFile(Resource resource, String contentType, String filename) {}
}
