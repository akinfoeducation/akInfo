package com.akt.institute.notification.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.notification")
@Getter
@Setter
public class NotificationProperties {

    private boolean emailEnabled = true;
    private boolean whatsappEnabled = false;

    private Email    email    = new Email();
    private WhatsApp whatsapp = new WhatsApp();

    @Getter
    @Setter
    public static class Email {
        private String from;
        private String fromName = "AKT Info Institute";
        private int maxRetries = 3;
    }

    @Getter
    @Setter
    public static class WhatsApp {
        /**
         * Provider selection: META (default) or WATI
         * META → uses Meta Cloud API (graph.facebook.com)
         * WATI → uses WATI API (live-server-XXXXX.wati.io)
         */
        private String provider = "META";

        // ── Meta Cloud API settings ──────────────────────────────────────────
        /** Meta Graph API base URL — https://graph.facebook.com/v18.0 */
        private String apiBaseUrl = "https://graph.facebook.com/v18.0";
        /** Phone Number ID from Meta Business Manager */
        private String phoneNumberId;
        /** Bearer token from Meta Developer Console */
        private String accessToken;

        // ── WATI settings ────────────────────────────────────────────────────
        /** WATI API endpoint — e.g. https://live-server-XXXXX.wati.io */
        private String watiApiUrl;
        /** WATI Bearer token from WATI dashboard → Integrations → API */
        private String watiToken;

        private int maxRetries = 3;

        public boolean isMetaProvider() {
            return !"WATI".equalsIgnoreCase(provider);
        }
    }
}
