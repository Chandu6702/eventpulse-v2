create table waitlist_entries (
    id             uuid primary key,
    ticket_type_id uuid        not null references ticket_types (id) on delete cascade,
    user_id        uuid        not null references users (id) on delete cascade,
    status         varchar(20) not null,
    created_at     timestamptz not null,
    notified_at    timestamptz,

    constraint uq_waitlist_ticket_type_user unique (ticket_type_id, user_id)
);

create index idx_waitlist_ticket_type_status on waitlist_entries (ticket_type_id, status, created_at);
