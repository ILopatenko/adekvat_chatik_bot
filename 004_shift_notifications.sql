ALTER TABLE shifts
ADD COLUMN start_message_sent_at TIMESTAMPTZ,
ADD COLUMN closing_message_sent_at TIMESTAMPTZ;

CREATE INDEX idx_shifts_start_message_sent ON shifts (start_message_sent_at);

CREATE INDEX idx_shifts_closing_message_sent ON shifts (closing_message_sent_at);