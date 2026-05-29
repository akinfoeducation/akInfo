package com.akt.institute.student.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StudentResponse {

    private Long id;
    private String uuid;
    private String studentNumber;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String phone;
    private String whatsappNumber;
    private LocalDate dateOfBirth;
    private String gender;
    private String address;
    private String city;
    private String state;
    private String pincode;
    private String photoUrl;
    private String parentName;
    private String parentPhone;
    private String parentEmail;
    private String emergencyContact;
    private String highestQualification;
    private String schoolCollegeName;
    private String aadhaarNumber;
    private String panNumber;
    private String status;
    private Long leadId;
    private String notes;
    private Long instituteId;
    private List<DocumentInfo> documents;
    private Instant createdAt;
    private Instant updatedAt;

    @Data
    @Builder
    public static class DocumentInfo {
        private Long id;
        private String documentType;
        private String fileName;
        private String fileUrl;
        private Long fileSizeBytes;
        private String mimeType;
        private boolean isVerified;
        private Instant createdAt;
    }
}
