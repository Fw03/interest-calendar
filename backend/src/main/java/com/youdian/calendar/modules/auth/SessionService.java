package com.youdian.calendar.modules.auth;

import com.youdian.calendar.common.Api;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.sql.Timestamp;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SessionService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final JdbcTemplate db;

    public SessionService(JdbcTemplate db) {
        this.db = db;
    }

    public record Login(String token, String accountId, Instant expiresAt) {}
    private record User(long id, String accountId) {}

    @Transactional
    public Login issue(String openid) {
        try {
            db.update("INSERT INTO users(openid,account_id) VALUES (?,?)", openid, UUID.randomUUID().toString());
        } catch (DuplicateKeyException existingUser) {
            // The unique openid also serializes simultaneous first logins.
        }
        User user = db.queryForObject("SELECT id,account_id FROM users WHERE openid=? FOR UPDATE",
                (row, number) -> new User(row.getLong("id"), row.getString("account_id")), openid);
        String token = randomToken();
        Instant expiry = Instant.now().plus(30, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
        db.update("DELETE FROM user_sessions WHERE user_id=? AND expires_at<=CURRENT_TIMESTAMP", user.id());
        db.update("INSERT INTO user_sessions(token_hash,user_id,expires_at) VALUES (?,?,?)",
                hash(token), user.id(), Timestamp.from(expiry));
        return new Login(token, user.accountId(), expiry);
    }

    public long requireUser(String authorization) {
        String digest = digest(authorization);
        List<Long> ids = db.queryForList("SELECT user_id FROM user_sessions WHERE token_hash=? AND expires_at>CURRENT_TIMESTAMP",
                Long.class, digest);
        if (ids.isEmpty()) throw Api.error(HttpStatus.UNAUTHORIZED, "登录已失效，请重新登录");
        return ids.get(0);
    }

    public void revoke(String authorization) {
        db.update("DELETE FROM user_sessions WHERE token_hash=?", digest(authorization));
    }

    public static String randomToken() {
        byte[] token = new byte[32];
        RANDOM.nextBytes(token);
        return HexFormat.of().formatHex(token);
    }

    public static String randomScene() {
        byte[] scene = new byte[16];
        RANDOM.nextBytes(scene);
        return HexFormat.of().formatHex(scene);
    }

    private static String digest(String authorization) {
        if (authorization == null || !authorization.matches("Bearer [a-f0-9]{64}")) {
            throw Api.error(HttpStatus.UNAUTHORIZED, "请先登录");
        }
        return hash(authorization.substring(7));
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.US_ASCII)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
