package com.akt.institute.notification.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class NotificationConfig {

    @Bean("notificationRestTemplate")
    public RestTemplate notificationRestTemplate() {
        return new RestTemplate();
    }
}
