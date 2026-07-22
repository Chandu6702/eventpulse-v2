package com.eventpulse.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Base class for exceptions that translate directly to an HTTP response.
 */
public abstract class ApiException extends RuntimeException {

    private final HttpStatus status;

    protected ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
