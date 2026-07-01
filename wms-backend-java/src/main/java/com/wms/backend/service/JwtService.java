package com.wms.backend.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {
    private final String jwtSecret;
    private Key signingKey;

    public JwtService(@Value("${jwt.secret}") String jwtSecret) {
        this.jwtSecret = jwtSecret;
    }

    @PostConstruct
    private void initKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String createToken(String sub, String email, String name, String provider, String role) {
        Date now = new Date();
        Date expiresAt = new Date(now.getTime() + 3600_000);

        return Jwts.builder()
                .setSubject(sub)
                .setIssuedAt(now)
                .setExpiration(expiresAt)
                .addClaims(Map.of(
                        "email", email,
                        "name", name,
                        "provider", provider,
                        "role", role
                ))
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
