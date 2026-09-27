package com.jobreview.employee;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisciplinaryRecordRepository extends JpaRepository<DisciplinaryRecord, Long> {

    @EntityGraph(attributePaths = "company")
    List<DisciplinaryRecord> findByEmployeeIdOrderByOccurredOnDesc(Long employeeId);

    /** Очередь модерации: самые старые первыми */
    @EntityGraph(attributePaths = {"employee", "company", "reportedBy"})
    List<DisciplinaryRecord> findByStatusOrderByCreatedAtAsc(DisciplinaryRecord.Status status);

    long countByStatus(DisciplinaryRecord.Status status);

    long countByEmployeeIdAndStatus(Long employeeId, DisciplinaryRecord.Status status);
}
