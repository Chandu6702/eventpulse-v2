create table orders (
    id                uuid primary key,
    user_id           uuid        not null references users (id),
    event_id          uuid        not null references events (id),
    status            varchar(20) not null,
    total_cents       bigint      not null check (total_cents >= 0),
    currency          varchar(3)  not null,
    idempotency_key   varchar(100),
    expires_at        timestamptz not null,
    confirmed_at      timestamptz,
    payment_reference varchar(100),
    created_at        timestamptz not null,
    updated_at        timestamptz not null,

    -- Replaying the same Idempotency-Key returns the original order
    -- instead of double-booking.
    constraint uq_orders_user_idempotency unique (user_id, idempotency_key)
);

create index idx_orders_user_id on orders (user_id);
create index idx_orders_status_expires_at on orders (status, expires_at);

create table order_items (
    id               uuid primary key,
    order_id         uuid   not null references orders (id) on delete cascade,
    ticket_type_id   uuid   not null references ticket_types (id),
    quantity         int    not null check (quantity > 0),
    unit_price_cents bigint not null check (unit_price_cents >= 0)
);

create index idx_order_items_order_id on order_items (order_id);

create table tickets (
    id             uuid primary key,
    order_id       uuid        not null references orders (id),
    ticket_type_id uuid        not null references ticket_types (id),
    event_id       uuid        not null references events (id),
    owner_id       uuid        not null references users (id),
    code           varchar(64) not null unique,
    status         varchar(20) not null,
    checked_in_at  timestamptz,
    created_at     timestamptz not null
);

create index idx_tickets_owner_id on tickets (owner_id);
create index idx_tickets_event_id on tickets (event_id);
