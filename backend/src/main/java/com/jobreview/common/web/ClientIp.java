package com.jobreview.common.web;

import jakarta.servlet.http.HttpServletRequest;

/**
 * IP клиента для ограничителя частоты. За nginx адрес уже подменён на реальный:
 * включён server.forward-headers-strategy=framework, он разбирает X-Forwarded-For.
 */
public final class ClientIp {

    private ClientIp() {
    }

    public static String of(HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        return ip == null ? "unknown" : ip;
    }
}
