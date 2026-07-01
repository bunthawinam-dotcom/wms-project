package com.wms.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.Map;

@Service
public class SupabaseService {
    private final String supabaseUrl;
    private final String supabaseKey;
    private final RestTemplate restTemplate;

    public SupabaseService(
            @Value("${supabase.url:}") String supabaseUrl,
            @Value("${supabase.service-role-key:}") String supabaseKey,
            RestTemplate restTemplate
    ) {
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.restTemplate = restTemplate;
    }

    public String upsertUser(String id, String email, String fullName, String provider) {
        if (supabaseUrl.isBlank() || supabaseKey.isBlank()) {
            return "user";
        }

        var url = supabaseUrl + "/rest/v1/users?on_conflict=id&return=representation";
        var headers = createHeaders();
        var body = Map.of(
                "id", id,
                "email", email,
                "full_name", fullName,
                "provider", provider
        );

        try {
            HttpEntity<Object> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map[]> response = restTemplate.exchange(url, HttpMethod.POST, request, Map[].class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && response.getBody().length > 0) {
                var user = response.getBody()[0];
                var role = user.get("role");
                if (role instanceof String roleStr && !roleStr.isBlank()) {
                    return roleStr;
                }
            }
        } catch (Exception ex) {
            // ignore and fallback to default role
        }

        return "user";
    }

    public String getUserRole(String id) {
        if (supabaseUrl.isBlank() || supabaseKey.isBlank()) {
            return "user";
        }

        var url = supabaseUrl + "/rest/v1/users?id=eq." + id + "&select=role";
        var headers = createHeaders();

        try {
            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<Map[]> response = restTemplate.exchange(url, HttpMethod.GET, request, Map[].class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && response.getBody().length > 0) {
                var role = response.getBody()[0].get("role");
                if (role instanceof String roleStr && !roleStr.isBlank()) {
                    return roleStr;
                }
            }
        } catch (Exception ex) {
            // ignore fallback
        }

        return "user";
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        headers.setBearerAuth(supabaseKey);
        headers.set("apikey", supabaseKey);
        headers.set("Prefer", "return=representation,resolution=merge-duplicates");
        return headers;
    }
}
