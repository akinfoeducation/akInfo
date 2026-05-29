package com.akt.institute.notification.channel;

import com.akt.institute.notification.config.NotificationProperties;
import com.akt.institute.notification.domain.NotificationChannel;
import com.akt.institute.notification.dto.SendMessageRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
@Slf4j
public class WhatsAppNotificationSender implements NotificationSender {

    private final NotificationProperties props;
    private final RestTemplate restTemplate;

    public WhatsAppNotificationSender(
        NotificationProperties props,
        @Qualifier("notificationRestTemplate") RestTemplate restTemplate
    ) {
        this.props = props;
        this.restTemplate = restTemplate;
    }

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.WHATSAPP;
    }

    @Override
    public boolean isEnabled() {
        if (!props.isWhatsappEnabled()) return false;
        var wa = props.getWhatsapp();
        if (wa.isMetaProvider()) {
            return wa.getAccessToken() != null && !wa.getAccessToken().isBlank()
                && wa.getPhoneNumberId() != null && !wa.getPhoneNumberId().isBlank();
        } else {
            // WATI
            return wa.getWatiToken() != null && !wa.getWatiToken().isBlank()
                && wa.getWatiApiUrl() != null && !wa.getWatiApiUrl().isBlank();
        }
    }

    @Override
    public void send(SendMessageRequest request) throws Exception {
        if (request.getRecipientPhone() == null || request.getRecipientPhone().isBlank()) {
            throw new IllegalArgumentException("Recipient phone is required for WhatsApp");
        }

        var wa = props.getWhatsapp();
        String to = normalizePhone(request.getRecipientPhone());

        if (wa.isMetaProvider()) {
            sendViaMeta(to, request.getBody(), wa);
        } else {
            sendViaWati(to, request.getBody(), wa);
        }

        log.info("WhatsApp sent → {} ({})", request.getRecipientPhone(), request.getRecipientName());
    }

    // ── Meta Cloud API ────────────────────────────────────────────────────────

    private void sendViaMeta(String to, String body, NotificationProperties.WhatsApp wa) throws Exception {
        String url = wa.getApiBaseUrl() + "/" + wa.getPhoneNumberId() + "/messages";

        Map<String, Object> payload = Map.of(
            "messaging_product", "whatsapp",
            "recipient_type",    "individual",
            "to",                to,
            "type",              "text",
            "text",              Map.of("preview_url", false, "body", body)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(wa.getAccessToken());

        ResponseEntity<String> response = restTemplate.exchange(
            url, HttpMethod.POST,
            new HttpEntity<>(payload, headers),
            String.class
        );

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Meta API error " + response.getStatusCode() + ": " + response.getBody());
        }
    }

    // ── WATI API ──────────────────────────────────────────────────────────────

    private void sendViaWati(String to, String body, NotificationProperties.WhatsApp wa) throws Exception {
        // WATI send session message endpoint
        String url = wa.getWatiApiUrl() + "/api/v1/sendSessionMessage/" + to;

        Map<String, Object> payload = Map.of("messageText", body);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(wa.getWatiToken());

        ResponseEntity<String> response = restTemplate.exchange(
            url, HttpMethod.POST,
            new HttpEntity<>(payload, headers),
            String.class
        );

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("WATI API error " + response.getStatusCode() + ": " + response.getBody());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Normalize to E.164 (91XXXXXXXXXX) — handles 10-digit Indian numbers. */
    private String normalizePhone(String phone) {
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.length() == 12 && digits.startsWith("91")) return digits;
        if (digits.length() == 10) return "91" + digits;
        return digits;
    }
}
