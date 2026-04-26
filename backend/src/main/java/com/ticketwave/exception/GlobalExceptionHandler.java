package com.ticketwave.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * Maps common application and security exceptions to HTTP responses.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String DEFAULT_VALIDATION_MESSAGE = "Validation failed";

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NoSuchElementException ex) {
        log.debug("Not found: {}", ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleConflict(IllegalStateException ex) {
        log.debug("Conflict: {}", ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(BusinessConflictException.class)
    public ResponseEntity<BusinessConflictResponse> handleBusinessConflict(BusinessConflictException ex) {
        log.debug("Business conflict [{}]: {}", ex.getCode(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new BusinessConflictResponse(
                        ex.getMessage(),
                        ex.getCode(),
                        ex.getBlockingCounts(),
                        Instant.now()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(IllegalArgumentException ex) {
        log.debug("Bad request: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(SeatDeactivationBlockedException.class)
    public ResponseEntity<SeatBlockedErrorResponse> handleSeatBlocked(SeatDeactivationBlockedException ex) {
        log.warn("Seat deactivation blocked: {} ticket(s)", ex.getTicketIds() != null ? ex.getTicketIds().size() : 0);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new SeatBlockedErrorResponse(ex.getMessage(), ex.getTicketIds(), Instant.now()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        log.debug("Access denied: {}", ex.getMessage());
        return buildResponse(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
                .map(this::formatFieldError)
                .collect(Collectors.joining(", "));

        if (errorMessage.isBlank()) {
            errorMessage = DEFAULT_VALIDATION_MESSAGE;
        }
        log.debug("Validation: {}", errorMessage);
        return buildResponse(HttpStatus.BAD_REQUEST, errorMessage);
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String message) {
        String errorMessage = (message == null || message.isBlank()) ? status.getReasonPhrase() : message;
        return ResponseEntity.status(status).body(new ErrorResponse(errorMessage, Instant.now()));
    }

    private String formatFieldError(FieldError fieldError) {
        String defaultMessage = fieldError.getDefaultMessage() == null ? "is invalid" : fieldError.getDefaultMessage();
        return fieldError.getField() + " " + defaultMessage;
    }
}

