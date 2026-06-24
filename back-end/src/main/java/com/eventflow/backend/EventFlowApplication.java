package com.eventflow.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.ZoneId;
import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
public class EventFlowApplication {
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone(VIETNAM_ZONE));
        SpringApplication.run(EventFlowApplication.class, args);
    }
}
