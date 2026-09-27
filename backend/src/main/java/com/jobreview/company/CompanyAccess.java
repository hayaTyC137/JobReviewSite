package com.jobreview.company;

import com.jobreview.common.error.AccessDeniedOperationException;
import com.jobreview.common.error.NotFoundException;
import com.jobreview.user.Role;
import com.jobreview.user.User;
import com.jobreview.user.UserRepository;
import org.springframework.stereotype.Component;

/**
 * Проверки «от чьего имени действует пользователь» для панели компании.
 * Держим их в одном месте, чтобы правила не разъехались между модулями.
 */
@Component
public class CompanyAccess {

    private final UserRepository userRepository;

    public CompanyAccess(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** Пользователь связан с компанией (в том числе пока его заявка на модерации) */
    public User requireLinkedRepresentative(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Пользователь не найден"));
        if (user.getRole() != Role.REPRESENTATIVE || user.getCompany() == null) {
            throw new NotFoundException("Вы пока не связаны с компанией — зарегистрируйте её в панели компании");
        }
        return user;
    }

    /**
     * Подтверждённый представитель опубликованной компании: только он ведёт трудовую историю,
     * оценивает сотрудников и приглашает коллег.
     */
    public User requireVerifiedRepresentative(Long userId) {
        User user = requireLinkedRepresentative(userId);
        if (!user.isRepresentativeVerified()) {
            throw new AccessDeniedOperationException("Ваш статус представителя ещё проверяется модератором");
        }
        if (!user.getCompany().isPublished()) {
            throw new AccessDeniedOperationException("Действие доступно после публикации компании в реестре");
        }
        return user;
    }
}
