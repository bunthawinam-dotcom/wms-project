package com.wms.backend.controller;

import com.wms.backend.payload.LoginRequest;
import com.wms.backend.service.JwtService;
import com.wms.backend.service.SupabaseService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping
public class AuthController {
    private final String clientId;
    private final String clientSecret;
    private final String appBaseUrl;
    private final String frontendBaseUrl;
    private final JwtService jwtService;
    private final SupabaseService supabaseService;
    private final RestTemplate restTemplate;

    public AuthController(
            @Value("${google.client-id}") String clientId,
            @Value("${google.client-secret}") String clientSecret,
            @Value("${app.base-url}") String appBaseUrl,
            @Value("${frontend.base-url}") String frontendBaseUrl,
            JwtService jwtService,
            SupabaseService supabaseService,
            RestTemplate restTemplate
    ) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.appBaseUrl = appBaseUrl;
        this.frontendBaseUrl = frontendBaseUrl;
        this.jwtService = jwtService;
        this.supabaseService = supabaseService;
        this.restTemplate = restTemplate;
    }

    @GetMapping("/auth/google")
    public ResponseEntity<Void> googleLogin() {
        if (clientId.isBlank() || clientSecret.isBlank()) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        var params = Map.of(
                "client_id", clientId,
                "redirect_uri", appBaseUrl + "/auth/google/callback",
                "response_type", "code",
                "scope", "openid email profile",
                "access_type", "offline",
                "prompt", "consent"
        );

        var query = params.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + encode(entry.getValue()))
                .reduce((a, b) -> a + "&" + b)
                .orElse("");

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create("https://accounts.google.com/o/oauth2/v2/auth?" + query))
                .build();
    }

    @GetMapping("/auth/google/callback")
    public ResponseEntity<Void> googleCallback(HttpServletRequest request) {
        var code = request.getParameter("code");
        var error = request.getParameter("error");

        if (error != null && !error.isBlank()) {
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(frontendBaseUrl + "/?error=" + encode(error)))
                    .build();
        }

        if (code == null || code.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        var tokenUri = "https://oauth2.googleapis.com/token";
        var body = new HashMap<String, String>();
        body.put("code", code);
        body.put("client_id", clientId);
        body.put("client_secret", clientSecret);
        body.put("redirect_uri", appBaseUrl + "/auth/google/callback");
        body.put("grant_type", "authorization_code");

        var tokenResponse = restTemplate.postForEntity(tokenUri, body, Map.class);
        if (!tokenResponse.getStatusCode().is2xxSuccessful() || tokenResponse.getBody() == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        var tokenBody = tokenResponse.getBody();
        if (tokenBody == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
        var accessToken = tokenBody.get("access_token");
        if (!(accessToken instanceof String accessTokenStr)) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        var userInfoUri = "https://www.googleapis.com/oauth2/v2/userinfo";
        var headers = new org.springframework.http.HttpHeaders();
        headers.setBearerAuth(accessTokenStr);
        var entity = new org.springframework.http.HttpEntity<>(headers);

        var userInfoResponse = restTemplate.exchange(userInfoUri, org.springframework.http.HttpMethod.GET, entity, Map.class);
        if (!userInfoResponse.getStatusCode().is2xxSuccessful() || userInfoResponse.getBody() == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> profile = (Map<String, Object>) userInfoResponse.getBody();
        var sub = profile.getOrDefault("id", "").toString();
        var email = profile.getOrDefault("email", "").toString();
        var name = profile.getOrDefault("name", "").toString();
        var role = supabaseService.upsertUser(sub, email, name, "google");

        var token = jwtService.createToken(sub, email, name, "google", role);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(frontendBaseUrl + "/?token=" + encode(token)))
                .build();
    }

    @PostMapping("/auth/exchange")
    public ResponseEntity<Map<String, Object>> exchangeToken(@RequestBody Map<String, String> requestBody) {
        var provider = requestBody.get("provider");
        var accessToken = requestBody.get("access_token");

        if (provider == null || accessToken == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing provider or access_token"));
        }

        if (!provider.equals("google")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unsupported provider"));
        }

        var userInfoUri = "https://www.googleapis.com/oauth2/v2/userinfo";
        var headers = new org.springframework.http.HttpHeaders();
        headers.setBearerAuth(accessToken);
        var entity = new org.springframework.http.HttpEntity<>(headers);

        var userInfoResponse = restTemplate.exchange(userInfoUri, org.springframework.http.HttpMethod.GET, entity, Map.class);
        if (!userInfoResponse.getStatusCode().is2xxSuccessful() || userInfoResponse.getBody() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Google token exchange failed"));
        }

        var profile = userInfoResponse.getBody();
        var sub = profile.getOrDefault("id", "").toString();
        var email = profile.getOrDefault("email", "").toString();
        var name = profile.getOrDefault("name", "").toString();
        var role = supabaseService.upsertUser(sub, email, name, "google");

        var token = jwtService.createToken(sub, email, name, "google", role);
        return ResponseEntity.ok(Map.of("token", token, "user", Map.of(
                "sub", sub,
                "email", email,
                "name", name,
                "provider", "google",
                "role", role
        )));
    }

    @PostMapping("/auth/login")
    public ResponseEntity<Map<String, Object>> localLogin(@Valid @RequestBody LoginRequest request) {
        var email = request.getEmail().toLowerCase();
        var name = email.contains("@") ? email.substring(0, email.indexOf("@")) : email;
        var role = supabaseService.upsertUser(email, email, name, "local");
        var token = jwtService.createToken(email, email, name, "local", role);

        return ResponseEntity.ok(Map.of("token", token, "user", Map.of(
                "sub", email,
                "email", email,
                "name", name,
                "provider", "local",
                "role", role
        )));
    }

    private String encode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
    }
}
