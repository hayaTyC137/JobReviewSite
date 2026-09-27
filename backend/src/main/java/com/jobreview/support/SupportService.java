package com.jobreview.support;

import com.jobreview.common.error.InvalidInputException;
import com.jobreview.common.error.NotFoundException;
import com.jobreview.user.User;
import com.jobreview.user.UserRepository;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupportService {

    static final EnumSet<SupportTicket.Status> OPEN = EnumSet.of(SupportTicket.Status.NEW, SupportTicket.Status.IN_PROGRESS);

    private final SupportTicketRepository repository;
    private final UserRepository userRepository;

    public SupportService(SupportTicketRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @Transactional
    public SupportDtos.TicketView create(SupportDtos.CreateTicket request, Long userId) {
        // Поле-ловушка заполняют только боты. Отвечаем обычной ошибкой, ничего не сохраняя
        if (request.website() != null && !request.website().isBlank()) {
            throw new InvalidInputException("Не удалось отправить обращение");
        }
        SupportTicket ticket = new SupportTicket();
        User user = userId == null ? null : userRepository.findById(userId).orElse(null);
        ticket.setUser(user);
        ticket.setName(request.name().trim());
        // У авторизованного пользователя ответ придёт на адрес аккаунта — подменить его в форме нельзя
        ticket.setEmail(user != null ? user.getEmail() : request.email().trim().toLowerCase(Locale.ROOT));
        ticket.setTopic(request.topic());
        ticket.setSubject(request.subject().trim());
        ticket.setMessage(request.message().trim());
        repository.save(ticket);
        return SupportDtos.TicketView.from(ticket);
    }

    @Transactional(readOnly = true)
    public List<SupportDtos.TicketView> mine(Long userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId).stream().map(SupportDtos.TicketView::from).toList();
    }

    @Transactional(readOnly = true)
    public List<SupportDtos.TicketView> queue(boolean onlyOpen) {
        EnumSet<SupportTicket.Status> statuses = onlyOpen ? OPEN : EnumSet.allOf(SupportTicket.Status.class);
        return repository.findByStatusInOrderByCreatedAtAsc(statuses).stream().map(SupportDtos.TicketView::from).toList();
    }

    @Transactional
    public SupportDtos.TicketView update(Long id, SupportDtos.UpdateTicket request, Long moderatorId) {
        SupportTicket ticket = repository.findById(id).orElseThrow(() -> new NotFoundException("Обращение не найдено"));
        if (request.status() == SupportTicket.Status.RESOLVED && (request.response() == null || request.response().isBlank())
                && ticket.getResponse() == null) {
            throw new InvalidInputException("Перед закрытием напишите ответ пользователю");
        }
        ticket.setStatus(request.status());
        if (request.response() != null && !request.response().isBlank()) {
            ticket.setResponse(request.response().trim());
        }
        ticket.setHandledBy(userRepository.getReferenceById(moderatorId));
        ticket.setUpdatedAt(LocalDateTime.now());
        return SupportDtos.TicketView.from(ticket);
    }
}
