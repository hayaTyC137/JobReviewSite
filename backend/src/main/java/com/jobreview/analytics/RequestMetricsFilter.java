package com.jobreview.analytics;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Считает запросы к /api/** для графика нагрузки в админке */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestMetricsFilter extends OncePerRequestFilter {

    private final RequestMetrics metrics;

    public RequestMetricsFilter(RequestMetrics metrics) {
        this.metrics = metrics;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long start = System.nanoTime();
        try {
            chain.doFilter(request, response);
        } finally {
            metrics.record((System.nanoTime() - start) / 1_000_000, response.getStatus());
        }
    }
}
