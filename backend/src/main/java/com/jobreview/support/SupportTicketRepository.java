package com.jobreview.support;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {

    List<SupportTicket> findByUserIdOrderByCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = "handledBy")
    List<SupportTicket> findByStatusInOrderByCreatedAtAsc(Collection<SupportTicket.Status> statuses);

    long countByStatusIn(Collection<SupportTicket.Status> statuses);
}
