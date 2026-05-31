package com.eventflow.backend.service;

import org.springframework.core.io.Resource;

public record StoredFile(
        String originalName,
        String contentType,
        long sizeBytes,
        String storageProvider,
        String storagePath) {

    public record Content(Resource resource, String contentType, String originalName, long sizeBytes) {
    }
}
