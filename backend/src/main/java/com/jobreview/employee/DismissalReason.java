package com.jobreview.employee;

/** Официальная причина увольнения — фиксированный список, чтобы работодатель не мог вписать оценочное суждение */
public enum DismissalReason {
    OWN_WISH("По собственному желанию"),
    MUTUAL_AGREEMENT("По соглашению сторон"),
    CONTRACT_END("Истечение срока договора"),
    REDUNDANCY("Сокращение штата"),
    RELOCATION("Переезд или перевод"),
    PROBATION_FAILED("Не пройден испытательный срок"),
    DISCIPLINARY("Дисциплинарное нарушение"),
    OTHER("Иная причина");

    private final String label;

    DismissalReason(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
