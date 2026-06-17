package com.akt.institute.faculty.domain;

import com.akt.institute.shared.domain.BaseEntity;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FacultyProfile extends BaseEntity {

    private Long   instituteId;
    private Long   userId;
    private String qualification;
    private int    experienceYears;
    private String subjects;
    private String skills;
    private String employeeType;   // FULL_TIME | PART_TIME | VISITING | CONTRACT
    private String bio;
    private String linkedinUrl;

    // denormalised from users join (read-only)
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String avatarUrl;
    private String designation;
    private String employeeId;
    private String username;
}
