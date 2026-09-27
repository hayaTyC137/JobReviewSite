package com.jobreview.common.error;

/**
 * Превышен лимит запросов (защита от перебора паролей, спама и накруток) — HTTP 429.
 */
public class TooManyRequestsException extends RuntimeException {

    public TooManyRequestsException(String message) {
        super(message);
    }
}
