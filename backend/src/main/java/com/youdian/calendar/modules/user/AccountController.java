package com.youdian.calendar.modules.user;

import com.youdian.calendar.common.Api;
import com.youdian.calendar.modules.auth.SessionService;
import com.youdian.calendar.modules.preference.PreferenceService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AccountController {
    private final JdbcTemplate db;
    private final SessionService sessions;
    private final PreferenceService preferences;

    public AccountController(JdbcTemplate db, SessionService sessions, PreferenceService preferences) {
        this.db = db;
        this.sessions = sessions;
        this.preferences = preferences;
    }

    record Confirmation(String confirm) {}
    record Feedback(@NotBlank @Size(max = 500) String message) {}

    @DeleteMapping("/users/me")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    Api<Void> delete(@RequestHeader(value = "Authorization", required = false) String auth,
                     @RequestBody Confirmation input) {
        long user = sessions.requireUser(auth);
        if (!"DELETE".equals(input.confirm())) throw Api.error(HttpStatus.BAD_REQUEST, "请确认账号删除");
        preferences.lockUser(user);
        db.update("DELETE FROM users WHERE id=?", user);
        return Api.ok(null);
    }

    @PostMapping("/feedback")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional(isolation = Isolation.READ_COMMITTED)
    Api<Void> feedback(@RequestHeader(value = "Authorization", required = false) String auth, @Valid @RequestBody Feedback feedback) {
        long user = sessions.requireUser(auth);
        preferences.lockUser(user);
        int count = db.queryForObject("""
                SELECT COUNT(*) FROM user_feedback WHERE user_id=? AND created_at>=CURRENT_DATE
                """, Integer.class, user);
        if (count >= 5) throw Api.error(HttpStatus.TOO_MANY_REQUESTS, "今日反馈次数已达上限");
        db.update("INSERT INTO user_feedback(user_id,message) VALUES (?,?)", user, feedback.message().strip());
        return Api.ok(null);
    }
}
