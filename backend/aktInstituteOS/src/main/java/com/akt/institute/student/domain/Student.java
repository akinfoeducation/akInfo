package com.akt.institute.student.domain;

import com.akt.institute.shared.domain.BaseEntity;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student extends BaseEntity {

    private String uuid;
    private Long instituteId;
    private String studentNumber;
    private String firstName;
    private String lastName;
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
    @Builder.Default
    private StudentStatus status = StudentStatus.ACTIVE;
    private Long leadId;
    private String notes;
    @Builder.Default
    private List<StudentDocument> documents = new ArrayList<>();

    public String getFullName() {
        return (lastName != null && !lastName.isBlank())
            ? firstName + " " + lastName
            : firstName;
    }
}
