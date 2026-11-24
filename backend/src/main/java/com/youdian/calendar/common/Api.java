package com.youdian.calendar.common;

import java.time.LocalDate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public record Api<T>(int code, String message, T data) {
    public static <T> Api<T> ok(T data) {
        return new Api<>(0, "ok", data);
    }

    public static ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }

    public static LocalDate validDate(LocalDate date) {
        if (date == null || date.getYear() < 1900 || date.getYear() > 2099) {
            throw error(HttpStatus.BAD_REQUEST, "日期范围为 1900–2099 年");
        }
        return date;
    }
}
