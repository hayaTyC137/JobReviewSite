package com.jobreview;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Точка входа бэкенда платформы «Контур» — сервиса отзывов о работодателях.
 */
@SpringBootApplication
public class JobReviewApplication {

    public static void main(String[] args) {
        SpringApplication.run(JobReviewApplication.class, args);
    }
}
