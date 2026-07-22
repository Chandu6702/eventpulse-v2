package com.eventpulse.order;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.eventpulse.common.dto.PageResponse;
import com.eventpulse.order.dto.ConfirmOrderRequest;
import com.eventpulse.order.dto.CreateOrderRequest;
import com.eventpulse.order.dto.OrderResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateOrderRequest request) {
        return orderService.create(UUID.fromString(jwt.getSubject()), idempotencyKey, request);
    }

    @GetMapping
    public PageResponse<OrderResponse> myOrders(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return orderService.myOrders(UUID.fromString(jwt.getSubject()), page, size);
    }

    @GetMapping("/{orderId}")
    public OrderResponse get(@PathVariable UUID orderId, @AuthenticationPrincipal Jwt jwt) {
        return orderService.get(orderId, UUID.fromString(jwt.getSubject()));
    }

    @PostMapping("/{orderId}/confirm")
    public OrderResponse confirm(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody(required = false) ConfirmOrderRequest request) {
        String paymentReference = request == null ? null : request.paymentReference();
        return orderService.confirm(orderId, UUID.fromString(jwt.getSubject()), paymentReference);
    }

    @PostMapping("/{orderId}/cancel")
    public OrderResponse cancel(@PathVariable UUID orderId, @AuthenticationPrincipal Jwt jwt) {
        return orderService.cancel(orderId, UUID.fromString(jwt.getSubject()));
    }
}
