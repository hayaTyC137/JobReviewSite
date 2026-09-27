package com.jobreview.review;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Репозиторий отзывов. Во всех «публичных» выборках передаём статус HIDDEN
 * в параметр excluded, чтобы скрытые модератором отзывы не попадали на сайт.
 */
public interface ReviewRepository extends JpaRepository<Review, Long>, JpaSpecificationExecutor<Review> {

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

    // ---------- Антинакрутка ----------

    boolean existsByAuthorIdAndCompanyIdAndCreatedAtAfter(Long authorId, Long companyId, LocalDateTime since);

    long countByAuthorIdAndCreatedAtAfter(Long authorId, LocalDateTime since);

    boolean existsByAuthorIdAndText(Long authorId, String text);

    // ---------- Администрирование и аналитика ----------

    /** Реестр отзывов в админке: автора и компанию подгружаем сразу, чтобы не было N+1 */
    @Override
    @EntityGraph(attributePaths = {"author", "company"})
    Page<Review> findAll(Specification<Review> spec, Pageable pageable);

    long countByStatus(ReviewStatus status);

    @Query("select avg(r.overallRating) from Review r where r.status <> com.jobreview.review.ReviewStatus.HIDDEN")
    Double averageVisibleRating();

    long countByCreatedAtAfter(LocalDateTime since);

    @Query("select r.createdAt from Review r where r.createdAt >= :from")
    List<LocalDateTime> findCreatedAtSince(@Param("from") LocalDateTime from);

    /** Самые обсуждаемые компании за период */
    @Query("select r.company.id as companyId, count(r) as reviews from Review r "
            + "where r.createdAt >= :from and r.status <> com.jobreview.review.ReviewStatus.HIDDEN "
            + "group by r.company.id order by count(r) desc")
    List<CompanyActivity> findMostActiveCompanies(@Param("from") LocalDateTime from, Pageable pageable);

    interface CompanyActivity {
        Long getCompanyId();

        long getReviews();
    }
}
