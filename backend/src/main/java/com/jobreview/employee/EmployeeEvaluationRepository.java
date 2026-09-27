package com.jobreview.employee;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeEvaluationRepository extends JpaRepository<EmployeeEvaluation, Long> {

    @EntityGraph(attributePaths = "author")
    List<EmployeeEvaluation> findByEmploymentIdInAndStatus(Collection<Long> employmentIds, EmployeeEvaluation.Status status);

    Optional<EmployeeEvaluation> findByEmploymentId(Long employmentId);

    @EntityGraph(attributePaths = {"employment", "employment.employee", "employment.company"})
    Optional<EmployeeEvaluation> findWithEmploymentById(Long id);
}
