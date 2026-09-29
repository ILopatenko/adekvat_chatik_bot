ALTER TABLE messages
ADD COLUMN reply_to_telegram_id BIGINT,
ADD COLUMN reply_to_user_id BIGINT REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX idx_messages_reply_to ON messages (reply_to_telegram_id);

CREATE INDEX idx_messages_reply_to_user ON messages (reply_to_user_id);