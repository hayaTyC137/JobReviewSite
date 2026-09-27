package com.jobreview.common.web;

/**
 * Регулярные выражения для @Pattern в DTO.
 */
public final class ValidationPatterns {

    /**
     * Картинки (аватар, логотип, баннер) — только файлы, загруженные через /api/files.
     * Внешние ссылки запрещены: чужой сервер картинок видел бы IP и заголовки всех посетителей.
     */
    public static final String UPLOADED_IMAGE = "^/api/files/[0-9a-f\\-]{36}\\.(png|jpg|webp)$";

    /** Сайт компании: домен или https-адрес, без javascript: и прочих схем */
    public static final String WEBSITE = "^(https?://)?[\\p{L}0-9.-]+\\.[\\p{L}]{2,}(/[^\\s<>\"']*)?$";

    /** Телефон: цифры, пробелы, скобки, дефисы и плюс в начале */
    public static final String PHONE = "^\\+?[0-9 ()\\-]{5,25}$";

    /** ИНН/IDNO: только цифры (10–13 знаков покрывают РФ, РБ, РК и Молдову) */
    public static final String TAX_ID = "^[0-9]{9,13}$";

    private ValidationPatterns() {
    }
}
