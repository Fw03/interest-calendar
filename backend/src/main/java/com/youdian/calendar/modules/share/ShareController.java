package com.youdian.calendar.modules.share;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.youdian.calendar.common.Api;
import com.youdian.calendar.modules.auth.SessionService;
import com.youdian.calendar.modules.calendar.CalendarService;
import com.youdian.calendar.modules.preference.PreferenceService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/shares")
public class ShareController {
    private static final Set<String> REFERRERS = Set.of("friend", "timeline", "poster");
    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final SessionService sessions;
    private final CalendarService calendar;
    private final PreferenceService preferences;
    private final WeChatCodeClient codes;

    public ShareController(JdbcTemplate db, ObjectMapper json, SessionService sessions,
                           CalendarService calendar, PreferenceService preferences, WeChatCodeClient codes) {
        this.db = db;
        this.json = json;
        this.sessions = sessions;
        this.calendar = calendar;
        this.preferences = preferences;
        this.codes = codes;
    }

    public record Create(@NotNull LocalDate date,
                         @NotNull @Pattern(regexp = "daily|quote") String templateId,
                         @NotNull @Pattern(regexp = "cream|ink|night|mint") String themeId) {}
    public record PublicCard(LocalDate date, String templateId, String themeId, List<CalendarService.Card> contents) {}
    public record Share(String token, Instant expiresAt, PublicCard card) {}
    private record Stored(long id, String token, Instant expiresAt, String json) {}

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional(isolation = Isolation.READ_COMMITTED)
    Api<Share> create(@RequestHeader(value = "Authorization", required = false) String auth,
                      @Valid @RequestBody Create input) throws JsonProcessingException {
        long user = sessions.requireUser(auth);
        preferences.lockUser(user);
        var day = calendar.day(input.date());
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        long count = db.queryForObject("SELECT COUNT(*) FROM share_records WHERE creator_user_id=? AND created_at>=?",
                Long.class, user, Timestamp.from(now.minus(1, ChronoUnit.DAYS)));
        if (count >= 30) throw Api.error(HttpStatus.TOO_MANY_REQUESTS, "今日分享创建次数已达上限");
        var quote = calendar.quote(input.date());
        var contents = input.templateId().equals("quote") ? List.of(quote) : List.of(calendar.almanac(day), quote);
        var card = new PublicCard(input.date(), input.templateId(), input.themeId(), contents);
        String token = SessionService.randomToken();
        Instant expiry = now.plus(7, ChronoUnit.DAYS);
        db.update("""
                INSERT INTO share_records(share_token,creator_user_id,share_date,template_id,public_payload_json,expires_at,poster_scene)
                VALUES (?,?,?,?,?,?,?)
                """, token, user, input.date(), input.templateId(), json.writeValueAsString(card), Timestamp.from(expiry), SessionService.randomScene());
        return Api.ok(new Share(token, expiry, card));
    }

    @GetMapping("/{token}")
    @Transactional
    Api<Share> open(@PathVariable String token, @RequestParam(required = false) String ref) throws JsonProcessingException {
        return open(readShare("share_token", token, "[a-f0-9]{64}"), ref);
    }

    @GetMapping("/poster/{scene}")
    @Transactional
    Api<Share> openPoster(@PathVariable String scene) throws JsonProcessingException {
        return open(readShare("poster_scene", scene, "[a-f0-9]{32}"), "poster");
    }

    @GetMapping("/{token}/code")
    ResponseEntity<byte[]> code(@PathVariable String token,
            @RequestHeader(value = "Authorization", required = false) String auth) {
        long user = sessions.requireUser(auth);
        if (!token.matches("[a-f0-9]{64}")) throw missing();
        String scene = db.query("""
                SELECT poster_scene FROM share_records
                WHERE share_token=? AND creator_user_id=? AND expires_at>CURRENT_TIMESTAMP
                """, (row, number) -> row.getString(1), token, user)
                .stream().filter(java.util.Objects::nonNull).findFirst().orElseThrow(this::missing);
        byte[] image = codes.image(scene);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .contentType(image[0] == (byte) 0x89 ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG).body(image);
    }

    record Report(@NotNull @Pattern(regexp = "content|copyright|other") String reason) {}

    @PostMapping("/{token}/reports")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    Api<Void> report(@PathVariable String token, @Valid @RequestBody Report report) {
        var stored = readShare("share_token", token, "[a-f0-9]{64}");
        int existing = db.queryForObject("""
                SELECT COUNT(*) FROM share_reports
                WHERE share_record_id=? AND reason=? AND report_date=CURRENT_DATE
                """, Integer.class, stored.id(), report.reason());
        if (existing == 0) {
            db.update("INSERT INTO share_reports(share_record_id,reason,report_date) VALUES (?,?,CURRENT_DATE)",
                    stored.id(), report.reason());
        }
        return Api.ok(null);
    }

    private Api<Share> open(Stored stored, String ref) throws JsonProcessingException {
        PublicCard card = json.readValue(stored.json(), PublicCard.class);
        db.update("INSERT INTO share_visits(share_record_id,referrer_type) VALUES (?,?)",
                stored.id(), ref != null && REFERRERS.contains(ref) ? ref : "direct");
        return Api.ok(new Share(stored.token(), stored.expiresAt(), card));
    }

    private Stored readShare(String column, String value, String pattern) {
        if (!value.matches(pattern)) throw missing();
        return db.query("""
                SELECT id,share_token,expires_at,public_payload_json FROM share_records
                WHERE %s=? AND expires_at>CURRENT_TIMESTAMP FOR UPDATE
                """.formatted(column), (row, number) -> new Stored(row.getLong(1), row.getString(2),
                row.getTimestamp(3).toInstant(), row.getString(4)), value)
                .stream().findFirst().orElseThrow(this::missing);
    }

    private RuntimeException missing() {
        return Api.error(HttpStatus.NOT_FOUND, "分享不存在或已过期");
    }
}
