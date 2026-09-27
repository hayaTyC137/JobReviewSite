package com.jobreview.profile;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileChangeRequestRepository extends JpaRepository<ProfileChangeRequest, Long> {

    List<ProfileChangeRequest> findByUserIdOrderByCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = "user")
    List<ProfileChangeRequest> findByStatusOrderByCreatedAtAsc(ProfileChangeRequest.Status status);

    boolean existsByUserIdAndFieldAndStatus(Long userId, ProfileChangeRequest.Field field, ProfileChangeRequest.Status status);

    long countByStatus(ProfileChangeRequest.Status status);
}
