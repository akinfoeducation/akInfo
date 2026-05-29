package com.akt.institute.notification.channel;

import com.akt.institute.notification.domain.NotificationChannel;
import com.akt.institute.notification.dto.SendMessageRequest;

/**
 * Abstraction over a delivery channel (Email, WhatsApp, SMS in future).
 */
public interface NotificationSender {

    NotificationChannel channel();

    /** Returns true if this channel is currently enabled and configured. */
    boolean isEnabled();

    /**
     * Sends a single message. Throws on failure — caller handles retry/logging.
     */
    void send(SendMessageRequest request) throws Exception;
}
