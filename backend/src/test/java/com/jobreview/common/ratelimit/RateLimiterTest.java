package com.jobreview.common.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jobreview.common.error.TooManyRequestsException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class RateLimiterTest {

    private final AtomicLong now = new AtomicLong(1_000_000);
    private final Clock clock = new Clock() {
        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(now.get());
        }
    };

    @Test
    void allowsLimitWithinWindowThenBlocksUntilWindowSlides() {
        RateLimiter limiter = new RateLimiter(true, clock);
        for (int i = 0; i < 3; i++) {
            assertThat(limiter.tryAcquire("login:1.2.3.4", 3, Duration.ofMinutes(1))).isTrue();
        }
        assertThat(limiter.tryAcquire("login:1.2.3.4", 3, Duration.ofMinutes(1))).isFalse();
        // Другой ключ считается отдельно
        assertThat(limiter.tryAcquire("login:5.6.7.8", 3, Duration.ofMinutes(1))).isTrue();

        now.addAndGet(Duration.ofSeconds(61).toMillis());
        assertThat(limiter.tryAcquire("login:1.2.3.4", 3, Duration.ofMinutes(1))).isTrue();
    }

    @Test
    void checkThrowsWithMessageAndDisabledLimiterAllowsEverything() {
        RateLimiter limiter = new RateLimiter(true, clock);
        limiter.check("k", 1, Duration.ofMinutes(1), "Слишком часто");
        assertThatThrownBy(() -> limiter.check("k", 1, Duration.ofMinutes(1), "Слишком часто"))
                .isInstanceOf(TooManyRequestsException.class)
                .hasMessage("Слишком часто");

        RateLimiter disabled = new RateLimiter(false, clock);
        for (int i = 0; i < 100; i++) {
            assertThat(disabled.tryAcquire("k", 1, Duration.ofMinutes(1))).isTrue();
        }
    }
}
