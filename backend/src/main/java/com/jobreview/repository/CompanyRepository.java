package com.jobreview.repository;

import com.jobreview.model.Company;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

/**
 * Репозиторий компаний. JpaSpecificationExecutor нужен для гибкого поиска:
 * фильтры собираются динамически в {@link com.jobreview.service.CompanySpecifications}.
 */
public interface CompanyRepository extends JpaRepository<Company, Long>, JpaSpecificationExecutor<Company> {

    Optional<Company> findBySlug(String slug);

    boolean existsBySlug(String slug);

    /** Пары «страна — город» для выпадающих списков в фильтре */
    @Query("select distinct c.country as country, c.city as city from Company c order by c.country, c.city")
    List<LocationView> findAllLocations();

    /** Проекция для запроса выше — Spring Data сам создаст реализацию */
    interface LocationView {
        String getCountry();

        String getCity();
    }
}
