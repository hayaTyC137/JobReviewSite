package com.jobreview.employee;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmploymentRecordRepository extends JpaRepository<EmploymentRecord, Long> {

    /** Трудовая история сотрудника: свежие места работы сверху */
    @EntityGraph(attributePaths = "company")
    List<EmploymentRecord> findByEmployeeIdOrderByStartDateDesc(Long employeeId);

    /** Сотрудники компании для панели представителя */
    @EntityGraph(attributePaths = "employee")
    List<EmploymentRecord> findByCompanyIdOrderByStartDateDesc(Long companyId);

    /** Открытая (без даты увольнения) запись о работе в этой компании — дубликат не заводим */
    boolean existsByEmployeeIdAndCompanyIdAndEndDateIsNull(Long employeeId, Long companyId);

    long countByCompanyId(Long companyId);

    long countByCompanyIdAndEndDateIsNull(Long companyId);
}
