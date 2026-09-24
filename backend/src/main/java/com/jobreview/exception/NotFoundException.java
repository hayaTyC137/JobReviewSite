package com.jobreview.exception;

/** Запрошенная сущность не найдена — превращается в HTTP 404. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
