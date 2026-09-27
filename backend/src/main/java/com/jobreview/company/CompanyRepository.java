package com.jobreview.company;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Репозиторий компаний. JpaSpecificationExecutor нужен для гибкого поиска:
 * фильтры собираются динамически в {@link CompanySpecifications}.
 */
public interface CompanyRepository extends JpaRepository<Company, Long>, JpaSpecificationExecutor<Company> {

    Optional<Company> findBySlug(String slug);

    /** Только опубликованные: всё публичное API работает через этот метод */
    Optional<Company> findBySlugAndStatus(String slug, CompanyStatus status);

    boolean existsBySlug(String slug);

    boolean existsByInnAndStatusNot(String inn, CompanyStatus status);

    long countByStatus(CompanyStatus status);

    /** Очередь модерации: самые старые заявки первыми */
    @EntityGraph(attributePaths = "createdBy")
    List<Company> findByStatusOrderByCreatedAtAsc(CompanyStatus status);

    /** Число опубликованных компаний по городам — для справочника локаций */
    @Query("select c.country as country, c.city as city, count(c) as companies from Company c "
            + "where c.status = :status group by c.country, c.city")
    List<LocationCount> countByLocation(@Param("status") CompanyStatus status);

    @Query("select c.createdAt from Company c where c.createdAt >= :from")
    List<LocalDateTime> findCreatedAtSince(@Param("from") LocalDateTime from);

    /** Проекция для запроса выше — Spring Data сам создаст реализацию */
    interface LocationCount {
        String getCountry();

        String getCity();

        long getCompanies();
    }
}
