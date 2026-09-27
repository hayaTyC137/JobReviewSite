package com.jobreview.common.error;

/** Запрошенная сущность не найдена — превращается в HTTP 404. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
