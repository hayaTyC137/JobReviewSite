package com.jobreview.common.error;

/**
 * Данные прошли синтаксическую проверку, но недопустимы по смыслу (например, значение настройки) — HTTP 400.
 */
public class InvalidInputException extends RuntimeException {

    public InvalidInputException(String message) {
        super(message);
    }
}
