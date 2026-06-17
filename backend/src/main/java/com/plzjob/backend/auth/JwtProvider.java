package com.plzjob.backend.auth;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtProvider {

    private final SecretKey key;
    private final long accessExpiration;
    private final long refreshExpiration;

    public JwtProvider(@Value("${jwt.secret}") String secret,
                       @Value("${jwt.access-expiration}") long accessExpiration,
                       @Value("${jwt.refresh-expiration}") long refreshExpiration) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpiration = accessExpiration;
        this.refreshExpiration = refreshExpiration;
    }

    public String createAccessToken(Long userId)  { return create(userId, accessExpiration); }
    public String createRefreshToken(Long userId) { return create(userId, refreshExpiration); }

    private String create(Long userId, long exp) {
        Date now = new Date();
        return Jwts.builder().subject(String.valueOf(userId))
                .issuedAt(now).expiration(new Date(now.getTime() + exp))
                .signWith(key).compact();
    }

    public Long getUserId(String token) { return Long.parseLong(parse(token).getSubject()); }

    public boolean isValid(String token) {
        try { parse(token); return true; } catch (JwtException e) { return false; }
    }

    private Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
