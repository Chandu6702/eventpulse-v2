create table events (
    id           uuid primary key,
    organizer_id uuid         not null references users (id),
    title        varchar(200) not null,
    description  text,
    category     varchar(30)  not null,
    venue        varchar(200) not null,
    city         varchar(100),
    starts_at    timestamptz  not null,
    ends_at      timestamptz  not null,
    status       varchar(20)  not null,
    published_at timestamptz,
    created_at   timestamptz  not null,
    updated_at   timestamptz  not null
);

create index idx_events_status_starts_at on events (status, starts_at);
create index idx_events_organizer_id on events (organizer_id);

create table ticket_types (
    id              uuid primary key,
    event_id        uuid         not null references events (id) on delete cascade,
    name            varchar(100) not null,
    price_cents     bigint       not null check (price_cents >= 0),
    currency        varchar(3)   not null default 'INR',
    capacity        int          not null check (capacity > 0),
    sold            int          not null default 0 check (sold >= 0),
    held            int          not null default 0 check (held >= 0),
    per_order_limit int          not null default 10 check (per_order_limit > 0),
    sales_start_at  timestamptz,
    sales_end_at    timestamptz,
    created_at      timestamptz  not null,
    updated_at      timestamptz  not null,

    -- Last line of defence against overselling: even if application-level
    -- locking is bypassed, the database will reject an oversold state.
    constraint chk_ticket_types_inventory check (sold + held <= capacity)
);

create index idx_ticket_types_event_id on ticket_types (event_id);
