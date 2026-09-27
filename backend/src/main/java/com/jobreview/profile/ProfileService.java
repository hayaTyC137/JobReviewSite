package com.jobreview.profile;

import com.jobreview.common.error.BusinessRuleException;
import com.jobreview.common.error.InvalidInputException;
import com.jobreview.common.error.NotFoundException;
import com.jobreview.common.web.ModerationDecisionRequest;
import com.jobreview.user.User;
import com.jobreview.user.UserDto;
import com.jobreview.user.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Личный кабинет: смена аватара и некритичных данных сразу, критичных — через заявку модератору.
 */
@Service
public class ProfileService {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$");

    private final UserRepository userRepository;
    private final ProfileChangeRequestRepository changeRepository;

    public ProfileService(UserRepository userRepository, ProfileChangeRequestRepository changeRepository) {
        this.userRepository = userRepository;
        this.changeRepository = changeRepository;
    }

    @Transactional
    public UserDto update(Long userId, ProfileDtos.UpdateProfile request) {
        User user = getUser(userId);
        user.setJobTitle(blankToNull(request.jobTitle()));
        user.setCountry(blankToNull(request.country()));
        user.setCity(blankToNull(request.city()));
        user.setBio(blankToNull(request.bio()));
        user.setAvatarUrl(blankToNull(request.avatarUrl()));
        return UserDto.from(user);
    }

    @Transactional
    public ProfileDtos.ChangeRequestView requestChange(Long userId, ProfileDtos.CreateChangeRequest request) {
        User user = getUser(userId);
        String newValue = request.newValue().trim();
        String current = currentValue(user, request.field());

        if (request.field() == ProfileChangeRequest.Field.EMAIL) {
            newValue = newValue.toLowerCase(Locale.ROOT);
            if (!EMAIL.matcher(newValue).matches()) {
                throw new InvalidInputException("Некорректный email");
            }
            if (userRepository.existsByEmailIgnoreCase(newValue)) {
                throw new BusinessRuleException("Этот email уже используется другим аккаунтом");
            }
        }
        if (request.field() == ProfileChangeRequest.Field.DISPLAY_NAME && newValue.length() > 120) {
            throw new InvalidInputException("Публичное имя — не длиннее 120 символов");
        }
        if (Objects.equals(current, newValue)) {
            throw new BusinessRuleException("Новое значение совпадает с текущим");
        }
        if (changeRepository.existsByUserIdAndFieldAndStatus(userId, request.field(), ProfileChangeRequest.Status.PENDING)) {
            throw new BusinessRuleException("Заявка на изменение этого поля уже на проверке");
        }

        ProfileChangeRequest change = new ProfileChangeRequest();
        change.setUser(user);
        change.setField(request.field());
        change.setOldValue(current);
        change.setNewValue(newValue);
        change.setReason(blankToNull(request.reason()));
        changeRepository.save(change);
        return ProfileDtos.ChangeRequestView.from(change);
    }

    @Transactional(readOnly = true)
    public List<ProfileDtos.ChangeRequestView> myRequests(Long userId) {
        return changeRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(ProfileDtos.ChangeRequestView::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ProfileDtos.ChangeRequestView> queue(ProfileChangeRequest.Status status) {
        return changeRepository.findByStatusOrderByCreatedAtAsc(status).stream()
                .map(ProfileDtos.ChangeRequestView::from).toList();
    }

    @Transactional
    public ProfileDtos.ChangeRequestView decide(Long id, ModerationDecisionRequest request, Long moderatorId) {
        ProfileChangeRequest change = changeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Заявка не найдена"));
        if (change.getStatus() != ProfileChangeRequest.Status.PENDING) {
            throw new BusinessRuleException("Заявка уже рассмотрена");
        }
        if (request.approved()) {
            apply(change);
        }
        change.setStatus(request.approved() ? ProfileChangeRequest.Status.APPROVED : ProfileChangeRequest.Status.REJECTED);
        change.setModerator(userRepository.getReferenceById(moderatorId));
        change.setModeratorComment(request.comment());
        change.setResolvedAt(LocalDateTime.now());
        return ProfileDtos.ChangeRequestView.from(change);
    }

    private void apply(ProfileChangeRequest change) {
        User user = change.getUser();
        switch (change.getField()) {
            case DISPLAY_NAME -> user.setDisplayName(change.getNewValue());
            case FULL_NAME -> user.setFullName(change.getNewValue());
            case EMAIL -> {
                // Пока заявка ждала решения, адрес мог занять кто-то другой
                if (userRepository.existsByEmailIgnoreCase(change.getNewValue())) {
                    throw new BusinessRuleException("Этот email уже занят — заявку можно только отклонить");
                }
                user.setEmail(change.getNewValue());
            }
        }
    }

    private static String currentValue(User user, ProfileChangeRequest.Field field) {
        return switch (field) {
            case DISPLAY_NAME -> user.getDisplayName();
            case FULL_NAME -> user.getFullName();
            case EMAIL -> user.getEmail();
        };
    }

    private User getUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new NotFoundException("Пользователь не найден"));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
