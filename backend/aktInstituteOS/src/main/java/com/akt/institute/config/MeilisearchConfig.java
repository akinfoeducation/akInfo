package com.akt.institute.config;

import com.meilisearch.sdk.Client;
import com.meilisearch.sdk.Config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MeilisearchConfig {

    @Value("${app.meilisearch.host}")
    private String host;

    @Value("${app.meilisearch.master-key}")
    private String masterKey;

    @Bean
    public Client meilisearchClient() {
        return new Client(new Config(host, masterKey));
    }
}
