package com.wms.backend.controller;

import com.wms.backend.service.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class UserController {
    private final JwtService jwtService;

    public UserController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(HttpServletRequest request) {
        var authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Missing Authorization header"));
        }

        var token = authHeader.substring(7);
        try {
            Claims claims = jwtService.parseToken(token);
            return ResponseEntity.ok(Map.of(
                    "user", Map.of(
                            "sub", claims.getSubject(),
                            "email", claims.get("email", String.class),
                            "name", claims.get("name", String.class),
                            "provider", claims.get("provider", String.class),
                            "role", claims.get("role", String.class)
                    )
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid or expired token"));
        }
    }
}
