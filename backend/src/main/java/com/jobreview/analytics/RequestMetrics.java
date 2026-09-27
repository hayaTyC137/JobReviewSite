package com.jobreview.analytics;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Лёгкие метрики нагрузки API за последний час: число запросов, ошибок 5xx и суммарное время
 * по минутам. Кольцевой буфер на 60 ячеек — память не растёт, блокировка короткая.
 * Для полноценного мониторинга в проде подключается Micrometer/Prometheus, здесь — наглядная сводка для админки.
 */
@Component
public class RequestMetrics {

    private static final int MINUTES = 60;

    private final long[] minuteStamp = new long[MINUTES];
    private final long[] requests = new long[MINUTES];
    private final long[] errors = new long[MINUTES];
    private final long[] totalMillis = new long[MINUTES];
    private final Clock clock;

    @Autowired
    public RequestMetrics() {
        this(Clock.systemUTC());
    }

    RequestMetrics(Clock clock) {
        this.clock = clock;
    }

    public synchronized void record(long durationMillis, int status) {
        long minute = clock.millis() / 60_000;
        int slot = (int) (minute % MINUTES);
        if (minuteStamp[slot] != minute) {
            minuteStamp[slot] = minute;
            requests[slot] = 0;
            errors[slot] = 0;
            totalMillis[slot] = 0;
        }
        requests[slot]++;
        totalMillis[slot] += durationMillis;
        if (status >= 500) {
            errors[slot]++;
        }
    }

    /** Снимок за последние 60 минут, от старой минуты к текущей */
    public synchronized Snapshot snapshot() {
        long now = clock.millis() / 60_000;
        List<Long> perMinute = new ArrayList<>(MINUTES);
        long total = 0;
        long totalErrors = 0;
        long millis = 0;
        for (long minute = now - MINUTES + 1; minute <= now; minute++) {
            int slot = (int) (minute % MINUTES);
            boolean fresh = minuteStamp[slot] == minute;
            long count = fresh ? requests[slot] : 0;
            perMinute.add(count);
            total += count;
            totalErrors += fresh ? errors[slot] : 0;
            millis += fresh ? totalMillis[slot] : 0;
        }
        return new Snapshot(perMinute, total, totalErrors, total == 0 ? 0 : Math.round((double) millis / total));
    }

    public record Snapshot(List<Long> requestsPerMinute, long requestsLastHour, long errorsLastHour, long averageLatencyMs) {
    }
}
