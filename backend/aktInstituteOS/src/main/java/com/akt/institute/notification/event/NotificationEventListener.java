package com.akt.institute.notification.event;

import com.akt.institute.notification.domain.NotificationChannel;
import com.akt.institute.notification.domain.TemplateType;
import com.akt.institute.notification.service.NotificationDispatcher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final NotificationDispatcher dispatcher;

    @EventListener
    public void onAdmission(AdmissionNotificationEvent event) {
        log.debug("Handling admission notification event for admission={}", event.getAdmissionId());

        Map<String, String> vars = Map.of(
            "studentName",     nvl(event.getStudentName()),
            "courseName",      nvl(event.getCourseName()),
            "admissionNumber", nvl(event.getAdmissionNumber()),
            "enrollmentDate",  nvl(event.getEnrollmentDate()),
            "feesAgreed",      event.getFeesAgreed() != null ? "₹" + event.getFeesAgreed().toPlainString() : ""
        );

        // Send on both channels (each channel checks its own enabled state)
        dispatcher.dispatch(
            event.getInstituteId(), NotificationChannel.EMAIL,
            TemplateType.ADMISSION_CONFIRMATION, vars,
            event.getStudentName(), event.getPhone(), event.getEmail(),
            "ADMISSION", event.getAdmissionId()
        );

        dispatcher.dispatch(
            event.getInstituteId(), NotificationChannel.WHATSAPP,
            TemplateType.ADMISSION_CONFIRMATION, vars,
            event.getStudentName(), event.getPhone(), null,
            "ADMISSION", event.getAdmissionId()
        );
    }

    @EventListener
    public void onFeePayment(FeePaymentNotificationEvent event) {
        log.debug("Handling fee payment notification event for payment={}", event.getPaymentId());

        Map<String, String> vars = Map.of(
            "studentName",       nvl(event.getStudentName()),
            "receiptNumber",     nvl(event.getReceiptNumber()),
            "amountPaid",        event.getAmountPaid() != null ? event.getAmountPaid().toPlainString() : "0",
            "balanceRemaining",  event.getBalanceRemaining() != null ? event.getBalanceRemaining().toPlainString() : "0",
            "paymentDate",       event.getPaymentDate() != null ? event.getPaymentDate().toString() : "",
            "paymentMode",       nvl(event.getPaymentMode())
        );

        dispatcher.dispatch(
            event.getInstituteId(), NotificationChannel.EMAIL,
            TemplateType.FEE_PAYMENT, vars,
            event.getStudentName(), event.getPhone(), event.getEmail(),
            "FEE_PAYMENT", event.getPaymentId()
        );

        dispatcher.dispatch(
            event.getInstituteId(), NotificationChannel.WHATSAPP,
            TemplateType.FEE_PAYMENT, vars,
            event.getStudentName(), event.getPhone(), null,
            "FEE_PAYMENT", event.getPaymentId()
        );
    }

    private static String nvl(String s) {
        return s != null ? s : "";
    }
}
