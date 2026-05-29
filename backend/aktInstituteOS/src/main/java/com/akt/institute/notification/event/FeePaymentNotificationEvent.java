package com.akt.institute.notification.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
public class FeePaymentNotificationEvent extends ApplicationEvent {

    private final Long       instituteId;
    private final Long       paymentId;
    private final String     studentName;
    private final String     phone;
    private final String     email;
    private final String     receiptNumber;
    private final BigDecimal amountPaid;
    private final BigDecimal balanceRemaining;
    private final LocalDate  paymentDate;
    private final String     paymentMode;

    public FeePaymentNotificationEvent(Object source, Long instituteId, Long paymentId,
                                       String studentName, String phone, String email,
                                       String receiptNumber, BigDecimal amountPaid,
                                       BigDecimal balanceRemaining, LocalDate paymentDate,
                                       String paymentMode) {
        super(source);
        this.instituteId      = instituteId;
        this.paymentId        = paymentId;
        this.studentName      = studentName;
        this.phone            = phone;
        this.email            = email;
        this.receiptNumber    = receiptNumber;
        this.amountPaid       = amountPaid;
        this.balanceRemaining = balanceRemaining;
        this.paymentDate      = paymentDate;
        this.paymentMode      = paymentMode;
    }
}
