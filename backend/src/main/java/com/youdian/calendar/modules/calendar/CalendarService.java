package com.youdian.calendar.modules.calendar;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nlf.calendar.Solar;
import com.youdian.calendar.common.Api;
import com.youdian.calendar.modules.preference.PreferenceService;
import java.time.Duration;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class CalendarService {
    private static final String WEEKDAYS = "日一二三四五六";
    private static final List<String> QUOTES = List.of(
            "给今天留一小段空白，写点自己喜欢的。", "慢一点也可以，日子会记得每一步。",
            "把目光收回来，看看手上这一件小事。", "给喜欢的事留个位置，哪怕只有十分钟。");
    private final JdbcTemplate db;
    private final PreferenceService preferences;
    private final ObjectMapper json;
    private final StringRedisTemplate redis;
    private final boolean useRedis;

    public CalendarService(JdbcTemplate db, PreferenceService preferences, ObjectMapper json, StringRedisTemplate redis,
                           @Value("${calendar.redis-cache}") boolean useRedis) {
        this.db = db;
        this.preferences = preferences;
        this.json = json;
        this.redis = redis;
        this.useRedis = useRedis;
    }

    public record Day(LocalDate date, int dayOfMonth, int weekday, String lunarLabel, String solarTerm) {}
    public record Card(String code, String title, Map<String, String> payload, boolean isDemo,
                       String sourceName, String availability) {}
    public record Daily(LocalDate date, Day day, List<Card> contents) {}

    public List<Day> month(int year, int month) {
        if (year < 1900 || year > 2099 || month < 1 || month > 12) {
            throw Api.error(HttpStatus.BAD_REQUEST, "月份无效");
        }
        YearMonth ym = YearMonth.of(year, month);
        String key = "calendar:month:v1:" + ym;
        if (useRedis) {
            try {
                String cached = redis.opsForValue().get(key);
                if (cached != null) return json.readValue(cached, new TypeReference<List<Day>>() {});
            } catch (DataAccessException | JsonProcessingException unavailable) {
                // Lunar calculations are the fallback for an unavailable cache.
            }
        }
        List<Day> days = new ArrayList<>();
        for (int day = 1; day <= ym.lengthOfMonth(); day++) days.add(day(ym.atDay(day)));
        if (useRedis) {
            try {
                redis.opsForValue().set(key, json.writeValueAsString(days), Duration.ofHours(12));
            } catch (DataAccessException | JsonProcessingException unavailable) {
                // A cache write failure cannot change the calendar response.
            }
        }
        return days;
    }

    public Day day(LocalDate date) {
        Api.validDate(date);
        var lunar = Solar.fromYmd(date.getYear(), date.getMonthValue(), date.getDayOfMonth()).getLunar();
        String label = lunar.getDay() == 1 ? lunar.getMonthInChinese() + "月" : lunar.getDayInChinese();
        return new Day(date, date.getDayOfMonth(), date.getDayOfWeek().getValue() % 7, label, lunar.getJieQi());
    }

    public Daily daily(LocalDate date, Long user) {
        Day day = day(date);
        var modules = preferences.modules();
        var order = user == null ? modules.stream().map(PreferenceService.Module::code).toList()
                : preferences.interests(user).selectedInterests();
        List<Card> cards = new ArrayList<>();
        for (String code : order) {
            var module = modules.stream().filter(value -> value.enabled() && value.code().equals(code)).findFirst();
            if (module.isEmpty() || code.equals("note")) continue;
            cards.add(switch (code) {
                case "quote" -> quote(date);
                case "almanac" -> almanac(day);
                case "zodiac" -> card(code, module.get().name(), "选择星座后查看娱乐演示。", "", "unconfigured");
                case "weather" -> card(code, module.get().name(), module.get().description(), "", "unconfigured");
                default -> card(code, module.get().name(), "即将上线", "", "coming-soon");
            });
        }
        return new Daily(date, day, cards);
    }

    public Card quote(LocalDate date) {
        return db.query("""
                SELECT title,content_json,source_name FROM daily_contents
                WHERE content_date=? AND module_code='quote' AND variant_key='default' AND published=TRUE
                """, (row, count) -> {
            try {
                var text = json.readTree(row.getString("content_json")).path("text");
                return text.isTextual() ? card("quote", row.getString("title"), text.asText(),
                        row.getString("source_name"), "available") : fallbackQuote(date);
            } catch (JsonProcessingException malformed) {
                return fallbackQuote(date);
            }
        }, date).stream().findFirst().orElseGet(() -> fallbackQuote(date));
    }

    private Card fallbackQuote(LocalDate date) {
        return card("quote", "每日名言", QUOTES.get((date.getDayOfMonth() - 1) % QUOTES.size()), "日有所喜原创", "available");
    }

    public Card almanac(Day day) {
        String text = "星期" + WEEKDAYS.charAt(day.weekday()) + " · 农历 " + day.lunarLabel();
        if (!day.solarTerm().isBlank()) text += " · " + day.solarTerm();
        return card("almanac", "传统黄历", text, "lunar-java", "available");
    }

    private Card card(String code, String title, String text, String source, String availability) {
        return new Card(code, title, Map.of("text", text), false, source, availability);
    }
}
