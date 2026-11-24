package com.youdian.calendar.modules.share;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.youdian.calendar.common.Api;
import java.io.IOException;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class WeChatCodeClient {
    private final String appId;
    private final String secret;
    private final String environment;
    private final RestClient http;
    private final ObjectMapper json;
    private String token;
    private Instant expires = Instant.EPOCH;

    public WeChatCodeClient(@Value("${calendar.wechat.app-id}") String appId,
                            @Value("${calendar.wechat.app-secret}") String secret,
                            @Value("${calendar.wechat.code-env}") String environment,
                            ObjectMapper json) {
        if (!Set.of("release", "trial", "develop").contains(environment)) {
            throw new IllegalArgumentException("Invalid WECHAT_CODE_ENV");
        }
        this.appId = appId;
        this.secret = secret;
        this.environment = environment;
        this.json = json;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.http = RestClient.builder().baseUrl("https://api.weixin.qq.com").requestFactory(factory).build();
    }

    public byte[] image(String scene) {
        if (appId.isBlank() || secret.isBlank()) {
            throw Api.error(HttpStatus.SERVICE_UNAVAILABLE, "微信小程序码尚未配置");
        }
        try {
            String current = accessToken();
            byte[] response = requestCode(scene, current);
            if (isImage(response)) return response;
            int error = response == null ? 0 : json.readTree(response).path("errcode").asInt();
            if (error == 40001 || error == 42001) {
                invalidate(current);
                response = requestCode(scene, accessToken());
                if (isImage(response)) return response;
            }
        } catch (RestClientException | IOException exception) {
            throw Api.error(HttpStatus.BAD_GATEWAY, "微信小程序码暂不可用");
        }
        throw Api.error(HttpStatus.BAD_GATEWAY, "微信小程序码暂不可用，请检查 AppID 与页面环境");
    }

    private byte[] requestCode(String scene, String accessToken) {
        return http.post().uri("/wxa/getwxacodeunlimit?access_token={token}", accessToken).body(Map.of(
                "scene", scene, "page", "pages/share-landing/index", "width", 280,
                "check_path", environment.equals("release"), "env_version", environment)).retrieve().body(byte[].class);
    }

    private synchronized String accessToken() {
        if (token != null && Instant.now().isBefore(expires)) return token;
        Access response = http.get().uri("/cgi-bin/token?grant_type=client_credential&appid={app}&secret={secret}",
                appId, secret).retrieve().body(Access.class);
        if (response == null || response.access_token() == null || response.expires_in() <= 60) {
            throw Api.error(HttpStatus.BAD_GATEWAY, "微信小程序码暂不可用");
        }
        token = response.access_token();
        expires = Instant.now().plusSeconds(response.expires_in() - 60);
        return token;
    }

    private synchronized void invalidate(String oldToken) {
        if (oldToken.equals(token)) expires = Instant.EPOCH;
    }

    private boolean isImage(byte[] bytes) {
        return bytes != null && bytes.length > 8 && bytes.length < 1_000_000 &&
                ((bytes[0] == (byte) 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G')
                || (bytes[0] == (byte) 0xff && bytes[1] == (byte) 0xd8));
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Access(String access_token, long expires_in) {}
}
