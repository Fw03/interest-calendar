package com.youdian.calendar.modules.event;

import com.youdian.calendar.common.Api;
import com.youdian.calendar.modules.auth.SessionService;
import com.youdian.calendar.modules.preference.PreferenceService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/events")
public class EventController {
    private static final RowMapper<CalendarEvent> EVENT = (row, number) -> new CalendarEvent(
            row.getString("client_id"), row.getObject("event_date", LocalDate.class), row.getString("title"),
            row.getString("content"), row.getString("kind"), row.getBoolean("completed"), row.getLong("version"));
    private static final String EVENT_COLUMNS = "SELECT client_id,event_date,title,content,kind,completed,version FROM user_events";
    private final JdbcTemplate db;
    private final SessionService sessions;
    private final PreferenceService preferences;

    public EventController(JdbcTemplate db, SessionService sessions, PreferenceService preferences) {
        this.db = db;
        this.sessions = sessions;
        this.preferences = preferences;
    }

    public record CalendarEvent(String id, LocalDate date, String title, String content, String kind, boolean completed, long version) {}
    public record EventInput(@Pattern(regexp = "[a-z0-9-]{8,64}") String id,
                             @NotNull LocalDate date,
                             @NotBlank @Size(max = 80) String title,
                             @NotNull @Size(max = 2000) String content,
                             @NotNull @Pattern(regexp = "note|todo") String kind,
                             boolean completed, Long version,
                             @Pattern(regexp = "[a-z0-9-]{8,64}") String mutationId) {}

    @GetMapping
    Api<List<CalendarEvent>> list(@RequestHeader(value = "Authorization", required = false) String auth,
                                  @RequestParam(required = false) LocalDate date) {
        long user = sessions.requireUser(auth);
        if (date != null) {
            return Api.ok(db.query(EVENT_COLUMNS + " WHERE user_id=? AND event_date=? ORDER BY id",
                    EVENT, user, Api.validDate(date)));
        }
        return Api.ok(db.query(EVENT_COLUMNS + " WHERE user_id=? ORDER BY event_date,id", EVENT, user));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional(isolation = Isolation.READ_COMMITTED)
    Api<CalendarEvent> create(@RequestHeader(value = "Authorization", required = false) String auth,
                              @Valid @RequestBody EventInput input) {
        long user = sessions.requireUser(auth);
        preferences.lockUser(user);
        Api.validDate(input.date());
        String id = input.id() == null ? java.util.UUID.randomUUID().toString() : input.id();
        List<CalendarEvent> existing = find(user, id);
        if (!existing.isEmpty()) {
            var event = existing.get(0);
            if (!matches(event, input) && !isReplay(user, id, input.mutationId())) throw conflict();
            return Api.ok(event);
        }
        db.update("""
                INSERT INTO user_events(user_id,client_id,event_date,title,content,kind,completed,last_mutation_id)
                VALUES (?,?,?,?,?,?,?,?)
                """, user, id, input.date(), input.title().strip(), input.content(), input.kind(),
                input.completed() && input.kind().equals("todo"), input.mutationId());
        return Api.ok(requireEvent(user, id));
    }

    @PutMapping("/{id}")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    Api<CalendarEvent> update(@RequestHeader(value = "Authorization", required = false) String auth,
                              @PathVariable String id, @Valid @RequestBody EventInput input) {
        long user = sessions.requireUser(auth);
        preferences.lockUser(user);
        var existing = requireEvent(user, id);
        Api.validDate(input.date());
        if (matches(existing, input) || isReplay(user, id, input.mutationId())) return Api.ok(existing);
        if (input.version() == null || input.version() != existing.version()) throw conflict();
        db.update("""
                UPDATE user_events SET event_date=?,title=?,content=?,kind=?,completed=?,last_mutation_id=?,
                    version=version+1,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND client_id=?
                """, input.date(), input.title().strip(), input.content(), input.kind(),
                input.completed() && input.kind().equals("todo"), input.mutationId(), user, id);
        return Api.ok(requireEvent(user, id));
    }

    @DeleteMapping("/{id}")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    Api<Void> delete(@RequestHeader(value = "Authorization", required = false) String auth,
                     @PathVariable String id, @RequestParam(required = false) Long version) {
        long user = sessions.requireUser(auth);
        preferences.lockUser(user);
        var event = requireEvent(user, id);
        if (version != null && version != event.version()) throw conflict();
        db.update("DELETE FROM user_events WHERE user_id=? AND client_id=?", user, id);
        return Api.ok(null);
    }

    private List<CalendarEvent> find(long user, String id) {
        return db.query(EVENT_COLUMNS + " WHERE user_id=? AND client_id=?", EVENT, user, id);
    }

    private CalendarEvent requireEvent(long user, String id) {
        return find(user, id).stream().findFirst().orElseThrow(() -> Api.error(HttpStatus.NOT_FOUND, "日程不存在"));
    }

    private boolean isReplay(long user, String id, String mutation) {
        return mutation != null && mutation.equals(db.queryForObject(
                "SELECT last_mutation_id FROM user_events WHERE user_id=? AND client_id=?", String.class, user, id));
    }

    private boolean matches(CalendarEvent event, EventInput input) {
        return event.date().equals(input.date()) && event.title().equals(input.title().strip())
                && event.content().equals(input.content()) && event.kind().equals(input.kind())
                && event.completed() == (input.completed() && input.kind().equals("todo"));
    }

    private RuntimeException conflict() {
        return Api.error(HttpStatus.CONFLICT, "日程已在其他设备更新");
    }
}
