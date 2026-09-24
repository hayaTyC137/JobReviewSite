package com.jobreview.service;

import com.jobreview.dto.CompanySearchFilter;
import com.jobreview.model.Company;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

/**
 * Собирает условие WHERE для поиска компаний из заполненных полей фильтра.
 * Каждое непустое поле добавляет одно условие, все условия объединяются через AND.
 */
public final class CompanySpecifications {

    private CompanySpecifications() {
    }

    public static Specification<Company> matches(CompanySearchFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Поиск по названию: ищем и в бренде, и в юридическом наименовании, без учёта регистра
            if (hasText(filter.q())) {
                String pattern = "%" + filter.q().trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("legalName")), pattern)));
            }
            if (hasText(filter.country())) {
                predicates.add(cb.equal(root.get("country"), filter.country().trim()));
            }
            if (hasText(filter.city())) {
                predicates.add(cb.equal(root.get("city"), filter.city().trim()));
            }

            // Минимальные значения суб-рейтингов. Компании без оценок (null) при этом отсекаются —
            // если пользователь явно попросил «климат от 4», компания без данных ему не подходит.
            addMinimum(predicates, cb, root.get("rating").get("overall"), filter.minRating());
            addMinimum(predicates, cb, root.get("rating").get("climate"), filter.minClimate());
            addMinimum(predicates, cb, root.get("rating").get("management"), filter.minManagement());
            addMinimum(predicates, cb, root.get("rating").get("team"), filter.minTeam());
            addMinimum(predicates, cb, root.get("rating").get("office"), filter.minOffice());
            addMinimum(predicates, cb, root.get("rating").get("clients"), filter.minClients());
            addMinimum(predicates, cb, root.get("rating").get("growth"), filter.minGrowth());

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static void addMinimum(List<Predicate> predicates,
                                   jakarta.persistence.criteria.CriteriaBuilder cb,
                                   jakarta.persistence.criteria.Path<Double> field,
                                   Double minimum) {
        // Ноль на слайдере означает «фильтр выключен»
        if (minimum != null && minimum > 0) {
            predicates.add(cb.greaterThanOrEqualTo(field, minimum));
        }
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
