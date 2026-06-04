package com.eventflow.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private static final String PROVIDER_LOCAL = "LOCAL";
    private static final String PROVIDER_SUPABASE = "SUPABASE";

    @Value("${eventflow.storage.supabase.enabled:false}")
    private boolean supabaseEnabled;

    @Value("${eventflow.storage.supabase.endpoint:}")
    private String supabaseEndpoint;

    @Value("${eventflow.storage.supabase.region:}")
    private String supabaseRegion;

    @Value("${eventflow.storage.supabase.access-key:}")
    private String supabaseAccessKey;

    @Value("${eventflow.storage.supabase.secret-key:}")
    private String supabaseSecretKey;

    @Value("${eventflow.storage.supabase.bucket:}")
    private String supabaseBucket;

    @Value("${eventflow.upload.task-report-dir:uploads/task-reports}")
    private String localUploadDir;

    public StoredFile store(MultipartFile file, String folder, long maxSizeBytes, Set<String> allowedContentTypes) {
        validateFile(file, maxSizeBytes, allowedContentTypes);
        String contentType = file.getContentType();
        String objectKey = folder + "/" + UUID.randomUUID() + resolveExtension(contentType, file.getOriginalFilename());

        if (supabaseEnabled) {
            return storeToSupabase(file, objectKey);
        }

        return storeToLocal(file, objectKey);
    }

    public StoredFile.Content load(String storageProvider, String storagePath, String contentType, String originalName, long sizeBytes) {
        if (PROVIDER_SUPABASE.equalsIgnoreCase(storageProvider)) {
            try {
                byte[] bytes = s3Client().getObjectAsBytes(GetObjectRequest.builder()
                        .bucket(supabaseBucket)
                        .key(storagePath)
                        .build()).asByteArray();
                return new StoredFile.Content(new ByteArrayResource(bytes), contentType, originalName, bytes.length);
            } catch (S3Exception e) {
                throw supabaseStorageException(e);
            }
        }

        Path filePath = Paths.get(storagePath);
        var resource = new FileSystemResource(filePath);
        if (!resource.exists() || !resource.isReadable()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy file");
        }
        return new StoredFile.Content(resource, contentType, originalName, sizeBytes);
    }

    public void delete(String storageProvider, String storagePath) {
        if (storagePath == null || storagePath.isBlank()) {
            return;
        }
        if (PROVIDER_SUPABASE.equalsIgnoreCase(storageProvider)) {
            try {
                s3Client().deleteObject(builder -> builder.bucket(supabaseBucket).key(storagePath));
            } catch (RuntimeException ignored) {
                // A missing old object should not block updating metadata.
            }
            return;
        }
        try {
            Files.deleteIfExists(Paths.get(storagePath));
        } catch (IOException ignored) {
            // A missing old file should not block updating metadata.
        }
    }

    private StoredFile storeToSupabase(MultipartFile file, String objectKey) {
        try {
            s3Client().putObject(PutObjectRequest.builder()
                            .bucket(supabaseBucket)
                            .key(objectKey)
                            .contentType(file.getContentType())
                            .contentLength(file.getSize())
                            .build(),
                    RequestBody.fromBytes(file.getBytes()));
            return new StoredFile(file.getOriginalFilename(), file.getContentType(), file.getSize(), PROVIDER_SUPABASE, objectKey);
        } catch (S3Exception e) {
            throw supabaseStorageException(e);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không đọc được file upload", e);
        }
    }

    private ResponseStatusException supabaseStorageException(S3Exception e) {
        String message = e.awsErrorDetails() != null
                ? e.awsErrorDetails().errorMessage()
                : e.getMessage();
        if (message != null && message.toLowerCase().contains("signature")) {
            return new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Supabase Storage từ chối chữ ký S3. Kiểm tra lại endpoint, region, access key và secret key.",
                    e);
        }
        return new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Không kết nối được Supabase Storage: " + (message != null ? message : "lỗi S3 không xác định"),
                e);
    }

    private StoredFile storeToLocal(MultipartFile file, String objectKey) {
        try {
            Path uploadDir = Paths.get(localUploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadDir);
            Path filePath = uploadDir.resolve(objectKey).normalize();
            if (!filePath.startsWith(uploadDir)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đường dẫn upload không hợp lệ");
            }
            Files.createDirectories(filePath.getParent());
            file.transferTo(filePath);
            return new StoredFile(file.getOriginalFilename(), file.getContentType(), file.getSize(), PROVIDER_LOCAL, filePath.toString());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không lưu được file upload", e);
        }
    }

    private void validateFile(MultipartFile file, long maxSizeBytes, Set<String> allowedContentTypes) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File upload không được để trống");
        }
        if (file.getSize() > maxSizeBytes) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File upload vượt quá dung lượng cho phép");
        }
        String contentType = file.getContentType();
        if (allowedContentTypes != null && !allowedContentTypes.isEmpty()
                && (contentType == null || !allowedContentTypes.contains(contentType.toLowerCase()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Định dạng file không được hỗ trợ");
        }
    }

    private S3Client s3Client() {
        if (supabaseEndpoint.isBlank() || supabaseRegion.isBlank()
                || supabaseAccessKey.isBlank() || supabaseSecretKey.isBlank() || supabaseBucket.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Supabase Storage chưa được cấu hình đầy đủ");
        }

        return S3Client.builder()
                .endpointOverride(URI.create(supabaseEndpoint))
                .region(Region.of(supabaseRegion))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(supabaseAccessKey, supabaseSecretKey)))
                .forcePathStyle(true)
                .build();
    }

    private String resolveExtension(String contentType, String originalName) {
        if (contentType != null) {
            return switch (contentType.toLowerCase()) {
                case "image/png" -> ".png";
                case "image/webp" -> ".webp";
                case "image/gif" -> ".gif";
                case "image/jpeg" -> ".jpg";
                case "application/pdf" -> ".pdf";
                case "application/zip", "application/x-zip-compressed", "multipart/x-zip", "application/octet-stream" -> ".zip";
                default -> originalName != null && originalName.contains(".")
                        ? originalName.substring(originalName.lastIndexOf('.'))
                        : "";
            };
        }
        if (originalName == null || !originalName.contains(".")) {
            return "";
        }
        return originalName.substring(originalName.lastIndexOf('.'));
    }
}
