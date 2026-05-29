package com.akt.institute.admission.domain;

import com.akt.institute.shared.domain.BaseEntity;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Admission extends BaseEntity {

    private String uuid;
    private String admissionNumber;
    private Long instituteId;
    private Long leadId;
    private Long studentId;
    private String firstName;
    private String lastName;
    private String phone;
    private String email;
    private String courseName;
    private String batchName;
    private Long   batchId;     // FK to batches(id), optional
    @Builder.Default
    private BigDecimal feesAgreed = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal feesPaid = BigDecimal.ZERO;
    private LocalDate enrollmentDate;
    @Builder.Default
    private AdmissionStatus status = AdmissionStatus.PENDING;
    private String notes;

    public String getFullName() {
        return (lastName != null && !lastName.isBlank())
            ? firstName + " " + lastName
            : firstName;
    }

    public BigDecimal getFeesDue() {
        return feesAgreed.subtract(feesPaid);
    }
}
