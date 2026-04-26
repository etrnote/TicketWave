package com.ticketwave;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.jms.annotation.EnableJms;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Spring Boot entry point. Enables JMS listeners and {@link org.springframework.scheduling.annotation.Scheduled} jobs.
 */
@SpringBootApplication
@EnableJms
@EnableScheduling
public class TicketWaveApplication {

    public static void main(String[] args) {
        SpringApplication.run(TicketWaveApplication.class, args);
    }
}
