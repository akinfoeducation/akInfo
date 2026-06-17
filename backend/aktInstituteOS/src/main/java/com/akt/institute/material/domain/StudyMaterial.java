package com.akt.institute.material.domain;

import com.akt.institute.shared.domain.BaseEntity;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudyMaterial extends BaseEntity {

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
    private String  materialType;  // PDF | NOTES | PPT | ASSIGNMENT | LINK | VIDEO
    private String  fileUrl;
    private String  fileName;
    private Long    fileSizeBytes;
    private String  externalLink;
    private boolean active;
}
