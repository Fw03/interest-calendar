package com.youdian.calendar.modules.auth;

import com.youdian.calendar.common.Api;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final WeChatIdentity identity;
    private final SessionService sessions;

    public AuthController(WeChatIdentity identity, SessionService sessions) {
        this.identity = identity;
        this.sessions = sessions;
    }

    record Code(@NotBlank @Size(max = 128) String code) {}

    @PostMapping("/wechat/login")
    Api<SessionService.Login> login(@Valid @RequestBody Code request) {
        return Api.ok(sessions.issue(identity.exchange(request.code())));
    }

    @PostMapping("/logout")
    Api<Void> logout(@RequestHeader(value = "Authorization", required = false) String auth) {
        sessions.revoke(auth);
        return Api.ok(null);
    }
}
