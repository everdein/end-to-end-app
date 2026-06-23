package com.example.backend.api;

import jakarta.validation.ConstraintViolationException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ProblemDetail handleMethodArgumentNotValid(MethodArgumentNotValidException exception) {
    ProblemDetail problemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Request validation failed");
    List<String> errors =
        exception.getBindingResult().getFieldErrors().stream()
            .map((error) -> error.getField() + ": " + error.getDefaultMessage())
            .toList();
    problemDetail.setTitle("Invalid request");
    problemDetail.setProperty("errors", errors);
    return problemDetail;
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ProblemDetail handleConstraintViolation(ConstraintViolationException exception) {
    ProblemDetail problemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Request validation failed");
    List<String> errors =
        exception.getConstraintViolations().stream()
            .map((violation) -> violation.getPropertyPath() + ": " + violation.getMessage())
            .toList();
    problemDetail.setTitle("Invalid request");
    problemDetail.setProperty("errors", errors);
    return problemDetail;
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ProblemDetail handleResponseStatus(ResponseStatusException exception) {
    ProblemDetail problemDetail =
        ProblemDetail.forStatusAndDetail(exception.getStatusCode(), exception.getReason());
    problemDetail.setTitle(exception.getStatusCode().toString());
    return problemDetail;
  }

  @ExceptionHandler(IllegalStateException.class)
  public ProblemDetail handleIllegalState(IllegalStateException exception) {
    ProblemDetail problemDetail =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR, "The financial snapshot could not be processed");
    problemDetail.setTitle("Persistence failure");
    return problemDetail;
  }
}
