package com.eventpulse.order;

public enum OrderStatus {
    /** Inventory is held; waiting for payment confirmation. */
    PENDING,
    /** Paid; tickets issued. */
    CONFIRMED,
    /** Cancelled by the buyer before payment. */
    CANCELLED,
    /** Hold elapsed without payment; inventory released. */
    EXPIRED
}
