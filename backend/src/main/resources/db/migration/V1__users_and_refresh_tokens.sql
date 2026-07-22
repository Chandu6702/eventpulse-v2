create table users (
    id            uuid primary key,
    name          varchar(100) not null,
    email         varchar(255) not null unique,
    password_hash varchar(100) not null,
    role          varchar(20)  not null,
    created_at    timestamptz  not null,
    updated_at    timestamptz  not null
);

-- Refresh tokens are stored as SHA-256 hashes so a database leak
-- does not expose usable credentials. Rotation chain is tracked via
-- replaced_by_hash to detect token reuse after rotation.
create table refresh_tokens (
    id               uuid primary key,
    user_id          uuid        not null references users (id) on delete cascade,
    token_hash       varchar(64) not null unique,
    expires_at       timestamptz not null,
    revoked_at       timestamptz,
    replaced_by_hash varchar(64),
    created_at       timestamptz not null
);

create index idx_refresh_tokens_user_id on refresh_tokens (user_id);
