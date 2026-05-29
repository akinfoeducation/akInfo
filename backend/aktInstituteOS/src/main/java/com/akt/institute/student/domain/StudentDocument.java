package com.akt.institute.student.domain;

import com.akt.institute.shared.domain.BaseEntity;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentDocument extends BaseEntity {

    private Long studentId;
    private Long admissionId;
    private String documentType;
    private String fileName;
    private String fileUrl;
    private Long fileSizeBytes;
    private String mimeType;
    @Builder.Default
    private boolean isVerified = false;
    private Long verifiedBy;
    private Instant verifiedAt;
}
