package com.biometric.backend.web;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/** Business error that is returned to the client as {"code": ..., "message": ...}. */
@Getter
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
