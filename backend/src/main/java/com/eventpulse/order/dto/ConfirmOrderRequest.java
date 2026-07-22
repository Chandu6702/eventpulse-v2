package com.eventpulse.order.dto;

import jakarta.validation.constraints.Size;

/**
 * Payment is intentionally mocked: the reference stands in for a gateway
 * transaction id. Swapping in a real PSP would replace this endpoint with
 * a webhook, but the inventory state machine stays identical.
 */
public record ConfirmOrderRequest(
        @Size(max = 100) String paymentReference) {
}
