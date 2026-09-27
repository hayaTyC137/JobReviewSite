package com.jobreview.security.oauth;

import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;

/**
 * Хранилище регистраций, которое, в отличие от InMemoryClientRegistrationRepository, может быть пустым:
 * бин существует всегда, а SecurityConfig включает oauth2Login, только если есть хотя бы один провайдер.
 */
public class ConfiguredClientRegistrations implements ClientRegistrationRepository, Iterable<ClientRegistration> {

    private final Map<String, ClientRegistration> registrations = new LinkedHashMap<>();

    public ConfiguredClientRegistrations(List<ClientRegistration> registrations) {
        registrations.forEach(r -> this.registrations.put(r.getRegistrationId(), r));
    }

    @Override
    public ClientRegistration findByRegistrationId(String registrationId) {
        return registrations.get(registrationId);
    }

    @Override
    public Iterator<ClientRegistration> iterator() {
        return registrations.values().iterator();
    }

    public boolean isEmpty() {
        return registrations.isEmpty();
    }

    public Set<String> enabledIds() {
        return registrations.keySet();
    }
}
