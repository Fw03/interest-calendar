ALTER TABLE share_records ADD COLUMN poster_scene CHAR(32);
CREATE UNIQUE INDEX idx_share_poster_scene ON share_records(poster_scene);
