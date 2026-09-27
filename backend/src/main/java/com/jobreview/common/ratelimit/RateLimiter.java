package com.jobreview.common.ratelimit;

import com.jobreview.common.error.TooManyRequestsException;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Простой ограничитель частоты «скользящим окном» в памяти процесса.
 * Используется для входа, регистрации, обращений в поддержку и жалоб.
 *
 * Для одного экземпляра бэкенда этого достаточно; при горизонтальном масштабировании
 * счётчики нужно перенести в общее хранилище (Redis), интерфейс при этом не изменится.
 */
@Component
public class RateLimiter {

    /** Защита от неограниченного роста памяти при атаке с множества ключей */
    private static final int MAX_KEYS = 50_000;

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final boolean enabled;
    private final Clock clock;

    @Autowired
    public RateLimiter(@Value("${app.rate-limit.enabled:true}") boolean enabled) {
        this(enabled, Clock.systemUTC());
    }

    RateLimiter(boolean enabled, Clock clock) {
        this.enabled = enabled;
        this.clock = clock;
    }

    /**
     * Регистрирует попытку и бросает {@link TooManyRequestsException}, если за окно
     * {@code window} по ключу уже было {@code limit} попыток.
     */
    public void check(String key, int limit, Duration window, String message) {
        if (!tryAcquire(key, limit, window)) {
            throw new TooManyRequestsException(message);
        }
    }

    public boolean tryAcquire(String key, int limit, Duration window) {
        if (!enabled) {
            return true;
        }
        long now = clock.millis();
        long border = now - window.toMillis();
        if (hits.size() > MAX_KEYS) {
            hits.values().removeIf(deque -> deque.isEmpty() || deque.peekLast() < border);
        }
        Deque<Long> deque = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (deque) {
            while (!deque.isEmpty() && deque.peekFirst() < border) {
                deque.pollFirst();
            }
            if (deque.size() >= limit) {
                return false;
            }
            deque.addLast(now);
            return true;
        }
    }
}
