package com.youdian.calendar.modules.preference;

import com.youdian.calendar.common.Api;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

@Service
public class PreferenceService {
    private static final List<String> DEFAULTS = List.of("almanac", "quote", "note", "zodiac");
    private static final Set<String> THEMES = Set.of("cream", "ink", "night", "mint");
    private static final Set<String> SIGNS = Set.of("", "白羊座", "金牛座", "双子座", "巨蟹座", "狮子座",
            "处女座", "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座");
    private final JdbcTemplate db;

    public PreferenceService(JdbcTemplate db) {
        this.db = db;
    }

    public record Preferences(String themeId, String zodiacSign, long version) {}
    public record Interests(List<String> selectedInterests, long version) {}
    public record Module(String code, String name, String description, int sortOrder, boolean enabled) {}

    public List<Module> modules() {
        return db.query("SELECT code,name,description,sort_order,enabled FROM interest_modules ORDER BY sort_order",
                (row, number) -> new Module(row.getString(1), row.getString(2), row.getString(3), row.getInt(4), row.getBoolean(5)));
    }

    public Preferences preferences(long user) {
        return db.query("SELECT theme_id,zodiac_sign,version FROM user_preferences WHERE user_id=?",
                (row, number) -> new Preferences(row.getString(1), row.getString(2), row.getLong(3)), user)
                .stream().findFirst().orElse(new Preferences("cream", "", 0));
    }

    @Transactional(readOnly = true)
    public Interests interests(long user) {
        long version = preferences(user).version();
        if (version == 0) return new Interests(DEFAULTS, version);
        return new Interests(db.queryForList("SELECT module_code FROM user_interests WHERE user_id=? AND enabled=TRUE ORDER BY sort_order",
                String.class, user), version);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Preferences changePreferences(long user, Preferences value) {
        if (value.themeId() == null || value.zodiacSign() == null ||
                !THEMES.contains(value.themeId()) || !SIGNS.contains(value.zodiacSign())) {
            throw Api.error(HttpStatus.BAD_REQUEST, "主题或星座无效");
        }
        lockUser(user);
        Preferences current = preferences(user);
        if (current.themeId().equals(value.themeId()) && current.zodiacSign().equals(value.zodiacSign())) return current;
        assertVersion(current.version(), value.version());
        if (current.version() == 0) replaceInterests(user, DEFAULTS);
        return writePreferences(user, current.version(), value.themeId(), value.zodiacSign());
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Interests changeInterests(long user, Interests input) {
        List<String> selected = input.selectedInterests();
        List<String> allowed = modules().stream().filter(Module::enabled).map(Module::code).toList();
        if (selected == null || selected.size() > 32 || !allowed.containsAll(selected)) {
            throw Api.error(HttpStatus.BAD_REQUEST, "兴趣模块无效");
        }
        List<String> unique = List.copyOf(new LinkedHashSet<>(selected));
        lockUser(user);
        Interests current = interests(user);
        if (current.selectedInterests().equals(unique)) return current;
        assertVersion(current.version(), input.version());
        Preferences prefs = preferences(user);
        replaceInterests(user, unique);
        var saved = writePreferences(user, current.version(), prefs.themeId(), prefs.zodiacSign());
        return new Interests(unique, saved.version());
    }

    public void lockUser(long user) {
        if (db.queryForList("SELECT id FROM users WHERE id=? FOR UPDATE", Long.class, user).isEmpty()) {
            throw Api.error(HttpStatus.UNAUTHORIZED, "登录已失效");
        }
    }

    private void replaceInterests(long user, List<String> selection) {
        db.update("DELETE FROM user_interests WHERE user_id=?", user);
        for (int position = 0; position < selection.size(); position++) {
            db.update("INSERT INTO user_interests(user_id,module_code,enabled,sort_order) VALUES (?,?,TRUE,?)",
                    user, selection.get(position), position);
        }
    }

    private Preferences writePreferences(long user, long version, String theme, String sign) {
        if (version == 0) {
            db.update("INSERT INTO user_preferences(user_id,theme_id,zodiac_sign,version) VALUES (?,?,?,1)", user, theme, sign);
        } else {
            db.update("UPDATE user_preferences SET theme_id=?,zodiac_sign=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
                    theme, sign, user);
        }
        return new Preferences(theme, sign, version + 1);
    }

    private void assertVersion(long current, long provided) {
        if (current != provided) throw Api.error(HttpStatus.CONFLICT, "偏好已在其他设备更新");
    }
}
