package com.akt.institute.material.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class StudyMaterialResponse {
    private Long    id;
    private String  uuid;
    private Long    instituteId;
    private Long    courseId;
    private String  courseName;
    private Long    batchId;
    private String  batchName;
    private String  subject;
    private Long    uploadedBy;
    private String  uploaderName;
    private String  title;
    private String  description;
    private String  materialType;
    private String  fileUrl;
    private String  fileName;
    private Long    fileSizeBytes;
    private String  externalLink;
    private boolean active;
    private Instant createdAt;
}
