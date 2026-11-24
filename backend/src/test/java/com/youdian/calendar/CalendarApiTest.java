package com.youdian.calendar;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.youdian.calendar.modules.auth.WeChatIdentity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.BDDMockito.given;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"calendar.redis-cache=true", "debug=false", "calendar.wechat.app-id=", "calendar.wechat.app-secret="})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CalendarApiTest {
    private static final String API = "/api/v1";
    private static final String DATE = "2026-11-21";
    private static final String EVENT = """
            {"id":"test-event-01","date":"2026-11-21","title":"私人日程","content":"私密内容","kind":"note","completed":false}
            """;

    @Autowired MockMvc http;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;
    @MockitoBean WeChatIdentity wechat;
    @MockitoBean org.springframework.data.redis.core.StringRedisTemplate redis;

    @Test
    void calendarAndModulesArePublic() throws Exception {
        given(redis.opsForValue()).willThrow(new org.springframework.data.redis.RedisConnectionFailureException("test cache unavailable"));
        http.perform(get(API + "/calendar/month").param("year","2026").param("month","11"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].weekday").value(0))
                .andExpect(jsonPath("$.data[20].weekday").value(6));
        http.perform(get(API + "/calendar/month").param("year","2026").param("month","12"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[21].solarTerm").value("冬至"));
        http.perform(get(API + "/calendar/month").param("year","2026").param("month","13"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(400));
        http.perform(get(API + "/interests")).andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(8));
        http.perform(get(API + "/calendar/daily").param("date", DATE))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.contents[1].sourceName").value("日有所喜原创"))
                .andExpect(content().string(not(containsString("\"note\""))));
    }

    @Test
    void authenticationAndEventOwnership() throws Exception {
        String alice = login("event-alice");
        String bob = login("event-bob");
        http.perform(get(API + "/events")).andExpect(status().isUnauthorized());
        http.perform(post(API + "/events").header("Authorization", alice).contentType(APPLICATION_JSON).content(EVENT))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.version").value(1));
        http.perform(post(API + "/events").header("Authorization", alice).contentType(APPLICATION_JSON).content(EVENT))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.version").value(1));
        http.perform(get(API + "/events").header("Authorization", alice).param("date", DATE))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].title").value("私人日程"));
        http.perform(get(API + "/events").header("Authorization", bob).param("date", DATE))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(0));
        String url = API + "/events/test-event-01";
        String update = EVENT.strip().replace("私人日程", "改过的日程").replace("}", ",\"version\":1}");
        http.perform(put(url).header("Authorization", bob).contentType(APPLICATION_JSON).content(update))
                .andExpect(status().isNotFound());
        http.perform(delete(url).header("Authorization", bob).param("version","1"))
                .andExpect(status().isNotFound());
        http.perform(put(url).header("Authorization", alice).contentType(APPLICATION_JSON).content(update))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.version").value(2));
        http.perform(delete(url).header("Authorization", alice).param("version","1"))
                .andExpect(status().isConflict());
        http.perform(delete(url).header("Authorization", alice).param("version","2")).andExpect(status().isOk());
        http.perform(post(API + "/auth/logout").header("Authorization", alice)).andExpect(status().isOk());
        http.perform(get(API + "/events").header("Authorization", alice)).andExpect(status().isUnauthorized());
    }

    @Test
    void preferencesArePrivateOrderedAndVersioned() throws Exception {
        String alice = login("pref-alice");
        String bob = login("pref-bob");
        var path = API + "/users/me/";
        http.perform(put(path + "preferences").header("Authorization", alice).contentType(APPLICATION_JSON)
                        .content("{\"themeId\":\"night\",\"zodiacSign\":\"双鱼座\",\"version\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.version").value(1));
        http.perform(put(path + "interests").header("Authorization", alice).contentType(APPLICATION_JSON)
                        .content("{\"selectedInterests\":[\"quote\",\"music\",\"quote\"],\"version\":1}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.selectedInterests.length()").value(2));
        http.perform(put(path + "interests").header("Authorization", alice).contentType(APPLICATION_JSON)
                        .content("{\"selectedInterests\":[\"film\"],\"version\":1}"))
                .andExpect(status().isConflict());
        http.perform(get(path + "preferences").header("Authorization", bob))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.themeId").value("cream"));
        http.perform(get(API + "/calendar/daily").param("date", DATE).header("Authorization", alice))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.contents[0].code").value("quote"))
                .andExpect(jsonPath("$.data.contents[1].code").value("music"));
    }

    @Test
    void shareAllowlistAndExpiredLinks() throws Exception {
        String owner = login("share-alice");
        http.perform(post(API + "/events").header("Authorization", owner).contentType(APPLICATION_JSON).content(EVENT))
                .andExpect(status().isCreated());
        String body = "{\"date\":\"2026-11-21\",\"templateId\":\"daily\",\"themeId\":\"cream\"}";
        http.perform(post(API + "/shares").header("Authorization", owner).contentType(APPLICATION_JSON)
                        .content(body.replace("}", ",\"note\":\"私密内容\"}")))
                .andExpect(status().isBadRequest());
        String created = http.perform(post(API + "/shares").header("Authorization", owner)
                        .contentType(APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String token = json.readTree(created).at("/data/token").asText();
        assertThat(token).matches("[a-f0-9]{64}");
        http.perform(get(API + "/shares/" + token).param("ref","friend"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.card.contents.length()").value(2))
                .andExpect(content().string(not(containsString("私密内容"))))
                .andExpect(content().string(not(containsString("creator"))));
        assertThat(db.queryForObject("SELECT COUNT(*) FROM share_visits WHERE referrer_type='friend'", Integer.class)).isEqualTo(1);
        String poster = db.queryForObject("SELECT poster_scene FROM share_records WHERE share_token=?", String.class, token);
        assertThat(poster).matches("[a-f0-9]{32}");
        http.perform(get(API + "/shares/poster/" + poster))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.token").value(token));
        http.perform(get(API + "/shares/" + token + "/code")).andExpect(status().isUnauthorized());
        String other = login("share-bob");
        http.perform(get(API + "/shares/" + token + "/code").header("Authorization", other))
                .andExpect(status().isNotFound());
        http.perform(get(API + "/shares/" + token + "/code").header("Authorization", owner))
                .andExpect(status().isServiceUnavailable());
        http.perform(get(API + "/shares/invalid")).andExpect(status().isNotFound());
        db.update("UPDATE share_records SET expires_at=CURRENT_TIMESTAMP WHERE share_token=?", token);
        http.perform(get(API + "/shares/" + token)).andExpect(status().isNotFound());
    }

    @Test
    void accountDeletionCascadesAndReportsAreDeduplicated() throws Exception {
        String owner = login("remove-owner");
        String other = login("remove-other");
        for (String auth : new String[] {owner, other}) {
            http.perform(post(API + "/events").header("Authorization", auth).contentType(APPLICATION_JSON).content(EVENT))
                    .andExpect(status().isCreated());
        }
        http.perform(post(API + "/feedback").header("Authorization", owner).contentType(APPLICATION_JSON)
                        .content("{\"message\":\"测试反馈\"}"))
                .andExpect(status().isCreated()).andExpect(header().string("Cache-Control","no-store"));
        String body = "{\"date\":\"2026-11-21\",\"templateId\":\"quote\",\"themeId\":\"cream\"}";
        String created = http.perform(post(API + "/shares").header("Authorization", owner)
                        .contentType(APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String token = json.readTree(created).at("/data/token").asText();
        String sharePath = API + "/shares/" + token;
        for (int i = 0; i < 2; i++) {
            http.perform(post(sharePath + "/reports").contentType(APPLICATION_JSON)
                            .content("{\"reason\":\"content\"}"))
                    .andExpect(status().isCreated());
        }
        long user = db.queryForObject("SELECT id FROM users WHERE openid=?", Long.class, "verified-remove-owner");
        long share = db.queryForObject("SELECT id FROM share_records WHERE share_token=?", Long.class, token);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM share_reports WHERE share_record_id=?", Integer.class, share)).isEqualTo(1);
        http.perform(delete(API + "/users/me").header("Authorization", owner).contentType(APPLICATION_JSON)
                        .content("{\"confirm\":\"NO\"}"))
                .andExpect(status().isBadRequest());
        http.perform(delete(API + "/users/me").header("Authorization", owner).contentType(APPLICATION_JSON)
                        .content("{\"confirm\":\"DELETE\"}"))
                .andExpect(status().isOk());
        http.perform(get(API + "/events").header("Authorization", owner)).andExpect(status().isUnauthorized());
        http.perform(get(API + "/events").header("Authorization", other))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(1));
        http.perform(get(sharePath)).andExpect(status().isNotFound());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM user_feedback WHERE user_id=?", Integer.class, user)).isZero();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM share_reports WHERE share_record_id=?", Integer.class, share)).isZero();
    }

    private String login(String id) throws Exception {
        given(wechat.exchange(id)).willReturn("verified-" + id);
        String response = http.perform(post(API + "/auth/wechat/login").contentType(APPLICATION_JSON)
                        .content("{\"code\":\"" + id + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.openid").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(response).at("/data/token").asText();
    }
}
