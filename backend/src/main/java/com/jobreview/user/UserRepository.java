package com.jobreview.user;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    /** Подтверждённый представитель компании — показываем его на странице организации */
    Optional<User> findFirstByCompanyIdAndRoleAndRepresentativeVerifiedTrue(Long companyId, Role role);

    /** Все официальные представители компании (директор, HR…) */
    List<User> findByCompanyIdAndRoleAndRepresentativeVerifiedTrueOrderByCreatedAtAsc(Long companyId, Role role);

    /** Представители вместе с ожидающими подтверждения — для панели компании */
    List<User> findByCompanyIdAndRoleOrderByCreatedAtAsc(Long companyId, Role role);

    /**
     * Приглашённые представители уже проверенных компаний, которых ещё не подтвердил модератор.
     * Создатели новых компаний сюда не попадают: их подтверждает одобрение самой компании.
     */
    @EntityGraph(attributePaths = "company")
    @Query("select u from User u where u.role = com.jobreview.user.Role.REPRESENTATIVE and u.representativeVerified = false "
            + "and u.company.status = com.jobreview.company.CompanyStatus.APPROVED order by u.createdAt asc")
    List<User> findPendingRepresentatives();

    long countByRole(Role role);

    @Query("select count(distinct u.company.id) from User u "
            + "where u.role = com.jobreview.user.Role.REPRESENTATIVE and u.representativeVerified = true")
    long countCompaniesWithVerifiedRepresentative();

    long countByBlockedTrue();

    boolean existsByRole(Role role);

    long countByLastLoginAtAfter(LocalDateTime since);

    @Query("select u.createdAt from User u where u.createdAt >= :from")
    List<LocalDateTime> findCreatedAtSince(@Param("from") LocalDateTime from);
}
