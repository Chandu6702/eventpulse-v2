-- Optional cover image for an event. Stored as a URL: uploads would need
-- object storage (S3/Supabase Storage); a URL keeps the platform storage-free
-- while the schema stays forward-compatible with a real upload pipeline.
alter table events
    add column image_url varchar(500);
