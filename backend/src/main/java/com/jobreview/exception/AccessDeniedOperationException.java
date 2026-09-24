package com.jobreview.exception;

/**
 * Пользователь авторизован, но не имеет права на это действие
 * (например, представитель чужой компании пытается обжаловать отзыв) — HTTP 403.
 */
public class AccessDeniedOperationException extends RuntimeException {

    public AccessDeniedOperationException(String message) {
        super(message);
    }
}
