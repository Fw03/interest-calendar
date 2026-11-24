package com.youdian.calendar.common;

import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;

@RestControllerAdvice
public class ApiErrors extends ResponseEntityExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Api<Void>> status(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode())
                .body(new Api<>(exception.getStatusCode().value(), exception.getReason(), null));
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception exception, Object body, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        String message = status.is4xxClientError() ? "请求参数或方法无效" : "服务暂时不可用";
        return new ResponseEntity<>(new Api<>(status.value(), message, null), headers, status);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Api<Void>> unexpected(Exception exception) {
        LoggerFactory.getLogger(ApiErrors.class).error("API request failed ({})", exception.getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new Api<>(500, "服务暂时不可用", null));
    }
}
