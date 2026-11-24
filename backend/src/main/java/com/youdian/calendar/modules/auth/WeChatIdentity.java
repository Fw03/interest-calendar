package com.youdian.calendar.modules.auth;

import com.youdian.calendar.common.Api;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class WeChatIdentity {
    private final String appId;
    private final String secret;
    private final RestClient wechat;

    public WeChatIdentity(@Value("${calendar.wechat.app-id}") String appId,
                          @Value("${calendar.wechat.app-secret}") String secret) {
        this.appId = appId;
        this.secret = secret;
        var requestFactory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3)).build());
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.wechat = RestClient.builder().baseUrl("https://api.weixin.qq.com").requestFactory(requestFactory).build();
    }

    public String exchange(String code) {
        if (appId.isBlank() || secret.isBlank()) {
            throw Api.error(HttpStatus.SERVICE_UNAVAILABLE, "微信登录尚未配置");
        }
        Session response;
        try {
            response = wechat.get().uri("/sns/jscode2session?appid={app}&secret={secret}&js_code={code}&grant_type=authorization_code",
                    appId, secret, code).retrieve().body(Session.class);
        } catch (RestClientException exception) {
            throw Api.error(HttpStatus.BAD_GATEWAY, "微信登录暂不可用");
        }
        if (response == null || response.openid() == null || response.openid().isBlank()) {
            throw Api.error(HttpStatus.UNAUTHORIZED, "微信登录凭证已失效，请重试");
        }
        return response.openid();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Session(String openid) {}
}
