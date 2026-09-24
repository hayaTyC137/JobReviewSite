package com.jobreview.repository;

import com.jobreview.model.Appeal;
import com.jobreview.model.AppealStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppealRepository extends JpaRepository<Appeal, Long> {

    /** Очередь модерации: самые старые заявки первыми */
    @EntityGraph(attributePaths = {"review", "review.company", "review.author", "representative"})
    List<Appeal> findByStatusOrderByCreatedAtAsc(AppealStatus status);

    boolean existsByReviewIdAndStatus(Long reviewId, AppealStatus status);

    /** Открытые заявки сразу для страницы отзывов — одним запросом, а не по одному на отзыв */
    @EntityGraph(attributePaths = "representative")
    List<Appeal> findByReviewIdInAndStatus(Collection<Long> reviewIds, AppealStatus status);
}
