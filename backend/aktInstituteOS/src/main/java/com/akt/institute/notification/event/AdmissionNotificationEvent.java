package com.akt.institute.notification.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.math.BigDecimal;

@Getter
public class AdmissionNotificationEvent extends ApplicationEvent {

    private final Long   instituteId;
    private final Long   admissionId;
    private final String studentName;
    private final String phone;
    private final String email;
    private final String courseName;
    private final String admissionNumber;
    private final String enrollmentDate;
    private final BigDecimal feesAgreed;

    public AdmissionNotificationEvent(Object source, Long instituteId, Long admissionId,
                                      String studentName, String phone, String email,
                                      String courseName, String admissionNumber,
                                      String enrollmentDate, BigDecimal feesAgreed) {
        super(source);
        this.instituteId      = instituteId;
        this.admissionId      = admissionId;
        this.studentName      = studentName;
        this.phone            = phone;
        this.email            = email;
        this.courseName       = courseName;
        this.admissionNumber  = admissionNumber;
        this.enrollmentDate   = enrollmentDate;
        this.feesAgreed       = feesAgreed;
    }
}
