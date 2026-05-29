package com.akt.institute.student.search;

import com.akt.institute.student.domain.Student;
import lombok.Builder;
import lombok.Data;

/**
 * Meilisearch index document for a student.
 * Kept deliberately flat — only fields we actually search/filter on.
 */
@Data
@Builder
public class StudentSearchDocument {

    private Long id;
    private String studentNumber;
    private String firstName;
    private String lastName;
    private String fullName;
    private String phone;
    private String whatsappNumber;
    private String email;
    private String city;
    private String state;
    private String status;
    private Long instituteId;

    public static StudentSearchDocument from(Student s) {
        return StudentSearchDocument.builder()
            .id(s.getId())
            .studentNumber(s.getStudentNumber())
            .firstName(s.getFirstName())
            .lastName(s.getLastName())
            .fullName(s.getFullName())
            .phone(s.getPhone())
            .whatsappNumber(s.getWhatsappNumber())
            .email(s.getEmail())
            .city(s.getCity())
            .state(s.getState())
            .status(s.getStatus() != null ? s.getStatus().name() : null)
            .instituteId(s.getInstituteId())
            .build();
    }
}
