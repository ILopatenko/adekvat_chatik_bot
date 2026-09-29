ALTER TABLE message_media
ADD COLUMN local_path TEXT,
ADD COLUMN downloaded_at TIMESTAMPTZ,
ADD COLUMN download_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE message_media ADD CONSTRAINT message_media_download_status_check CHECK (
   download_status IN ('pending', 'downloaded', 'failed')
);

CREATE INDEX idx_message_media_download_status ON message_media (download_status);