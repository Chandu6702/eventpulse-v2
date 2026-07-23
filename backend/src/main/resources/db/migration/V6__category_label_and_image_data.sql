-- A free-text label for events whose category is OTHER ("Hackathon", "Standup
-- night", ...). Only meaningful when category = 'OTHER'.
alter table events
    add column category_label varchar(50);

-- Cover images may now be uploaded from the browser (downscaled client-side
-- and stored as a data URL) as well as linked, so the column loses its
-- URL-sized cap. Production-scale would move blobs to object storage; for a
-- storage-free deployment the compressed inline image is an accepted trade.
alter table events
    alter column image_url type text;
