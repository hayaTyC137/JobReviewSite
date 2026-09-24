package com.jobreview.exception;

/**
 * Нарушено бизнес-правило (например, повторная жалоба на тот же отзыв) — HTTP 409.
 */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }
}
