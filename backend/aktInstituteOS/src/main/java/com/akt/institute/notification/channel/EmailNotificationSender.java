package com.akt.institute.notification.channel;

import com.akt.institute.notification.config.NotificationProperties;
import com.akt.institute.notification.domain.NotificationChannel;
import com.akt.institute.notification.dto.SendMessageRequest;
import jakarta.mail.AuthenticationFailedException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailNotificationSender implements NotificationSender {

    private final JavaMailSender mailSender;
    private final NotificationProperties props;

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.EMAIL;
    }

    @Override
    public boolean isEnabled() {
        String from = props.getEmail().getFrom();
        return props.isEmailEnabled() && from != null && !from.isBlank();
    }

    @Override
    public void send(SendMessageRequest request) throws Exception {
        if (request.getRecipientEmail() == null || request.getRecipientEmail().isBlank()) {
            throw new IllegalArgumentException("Recipient email is required");
        }

        MimeMessage mime = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");

        String from     = props.getEmail().getFrom();
        String fromName = props.getEmail().getFromName();
        helper.setFrom(from, fromName);
        helper.setTo(request.getRecipientEmail());
        helper.setSubject(request.getSubject() != null
            ? request.getSubject()
            : "Notification from AKT Info Institute");
        helper.setText(request.getBody(), request.isHtmlBody());

        try {
            mailSender.send(mime);
            log.info("Email sent → {} ({})", request.getRecipientEmail(), request.getRecipientName());
        } catch (MailAuthenticationException ex) {
            // Give a clear, actionable error instead of the generic SMTP message
            throw new Exception(
                "Gmail authentication failed. " +
                "Gmail requires an App Password for SMTP — regular passwords are blocked. " +
                "Steps: Google Account → Security → 2-Step Verification → App passwords → " +
                "create one for Mail → paste the 16-char code as MAIL_PASSWORD in .env.local",
                ex
            );
        }
    }
}
