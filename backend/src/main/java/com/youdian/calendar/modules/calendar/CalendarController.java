package com.youdian.calendar.modules.calendar;

import com.youdian.calendar.common.Api;
import com.youdian.calendar.modules.auth.SessionService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/calendar")
public class CalendarController {
    private final CalendarService calendar;
    private final SessionService sessions;

    public CalendarController(CalendarService calendar, SessionService sessions) {
        this.calendar = calendar;
        this.sessions = sessions;
    }

    @GetMapping("/month")
    Api<List<CalendarService.Day>> month(@RequestParam int year, @RequestParam int month) {
        return Api.ok(calendar.month(year, month));
    }

    @GetMapping("/daily")
    Api<CalendarService.Daily> daily(@RequestParam LocalDate date,
            @RequestHeader(value = "Authorization", required = false) String auth) {
        return Api.ok(calendar.daily(date, auth == null ? null : sessions.requireUser(auth)));
    }
}
