package com.jobreview.repository;

import com.jobreview.model.Review;
import com.jobreview.model.ReviewStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Репозиторий отзывов. Во всех «публичных» выборках передаём статус HIDDEN
 * в параметр excluded, чтобы скрытые модератором отзывы не попадали на сайт.
 */
public interface ReviewRepository extends JpaRepository<Review, Long> {

    /** Лента отзывов компании, свежие сверху. Автора подгружаем сразу, чтобы не было N+1 */
    @EntityGraph(attributePaths = "author")
    Page<Review> findByCompanyIdAndStatusNotOrderByCreatedAtDesc(Long companyId, ReviewStatus excluded, Pageable pageable);

    /** Все видимые отзывы компании — для пересчёта рейтинга и аналитики */
    List<Review> findByCompanyIdAndStatusNot(Long companyId, ReviewStatus excluded);

    /** Самый свежий отзыв — показывается прямо в карточке компании в поиске */
    @EntityGraph(attributePaths = "author")
    Optional<Review> findFirstByCompanyIdAndStatusNotOrderByCreatedAtDesc(Long companyId, ReviewStatus excluded);

    long countByAuthorIdAndStatusNot(Long authorId, ReviewStatus excluded);

    long countByAuthorIdAndStatus(Long authorId, ReviewStatus status);

    @Query("select count(distinct r.company.id) from Review r where r.author.id = :authorId and r.status <> :excluded")
    long countDistinctCompaniesByAuthor(@Param("authorId") Long authorId, @Param("excluded") ReviewStatus excluded);

    Optional<Review> findFirstByAuthorIdOrderByCreatedAtDesc(Long authorId);
}
