package com.eventflow.backend.entity;

/**
 * WorkloadStatus dùng để phân loại mức tải công việc của member.
 * Không lưu xuống database.
 * Chỉ dùng trong response DTO khi API workload được gọi.
 */
public enum WorkloadStatus {
    LOW,
    NORMAL,
    HIGH,
    OVERLOADED
}