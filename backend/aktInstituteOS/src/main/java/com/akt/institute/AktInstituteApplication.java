package com.akt.institute;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

// AKT Institute OS v1.0.0 — https://akinfoinstitute.tech
@SpringBootApplication
@EnableAsync
@EnableScheduling
public class AktInstituteApplication {

    public static void main(String[] args) {
        SpringApplication.run(AktInstituteApplication.class, args);
    }
}
