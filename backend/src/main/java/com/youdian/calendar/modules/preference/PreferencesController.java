package com.youdian.calendar.modules.preference;

import com.youdian.calendar.common.Api;
import com.youdian.calendar.modules.auth.SessionService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class PreferencesController {
    private final SessionService sessions;
    private final PreferenceService preferences;

    public PreferencesController(SessionService sessions, PreferenceService preferences) {
        this.sessions = sessions;
        this.preferences = preferences;
    }

    @GetMapping("/interests")
    Api<List<PreferenceService.Module>> modules() { return Api.ok(preferences.modules()); }

    @GetMapping("/users/me/preferences")
    Api<PreferenceService.Preferences> preferences(@RequestHeader(value = "Authorization", required = false) String auth) {
        return Api.ok(preferences.preferences(sessions.requireUser(auth)));
    }

    @PutMapping("/users/me/preferences")
    Api<PreferenceService.Preferences> preferences(@RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody PreferenceService.Preferences value) {
        return Api.ok(preferences.changePreferences(sessions.requireUser(auth), value));
    }

    @GetMapping("/users/me/interests")
    Api<PreferenceService.Interests> interests(@RequestHeader(value = "Authorization", required = false) String auth) {
        return Api.ok(preferences.interests(sessions.requireUser(auth)));
    }

    @PutMapping("/users/me/interests")
    Api<PreferenceService.Interests> interests(@RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody PreferenceService.Interests value) {
        return Api.ok(preferences.changeInterests(sessions.requireUser(auth), value));
    }
}
