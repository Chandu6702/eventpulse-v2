package com.eventpulse.order;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Sweeps pending orders whose hold has elapsed. Each order is expired in its
 * own transaction (inside OrderService) so one poison order cannot block the
 * rest of the batch.
 */
@Component
public class OrderExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(OrderExpiryJob.class);

    private final OrderRepository orderRepository;
    private final OrderService orderService;

    public OrderExpiryJob(OrderRepository orderRepository, OrderService orderService) {
        this.orderRepository = orderRepository;
        this.orderService = orderService;
    }

    @Scheduled(fixedDelayString = "${app.booking.expiry-sweep-interval:PT30S}")
    public void expireOverdueOrders() {
        List<UUID> expired = orderRepository.findExpiredPendingIds(Instant.now());
        if (expired.isEmpty()) {
            return;
        }
        log.info("Expiring {} overdue pending orders", expired.size());
        for (UUID orderId : expired) {
            try {
                orderService.expireIfStillPending(orderId);
            } catch (Exception e) {
                log.error("Failed to expire order {}", orderId, e);
            }
        }
    }
}
