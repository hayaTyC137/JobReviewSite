package com.jobreview.complaint;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    @EntityGraph(attributePaths = "author")
    List<Complaint> findByStatusOrderByCreatedAtAsc(Complaint.Status status);

    List<Complaint> findByAuthorIdOrderByCreatedAtDesc(Long authorId);

    boolean existsByAuthorIdAndTargetTypeAndTargetIdAndStatus(Long authorId, Complaint.TargetType targetType,
                                                              Long targetId, Complaint.Status status);

    long countByStatus(Complaint.Status status);
}
