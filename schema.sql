-- schema.sql
BEGIN;

-- ============================================================
-- USERS
-- Current known state of Telegram users
-- ============================================================
CREATE TABLE
   users (
      id BIGSERIAL PRIMARY KEY,
      telegram_id BIGINT NOT NULL UNIQUE,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      bio TEXT,
      birthday_day SMALLINT,
      birthday_month SMALLINT,
      birthday_year SMALLINT,
      language_code TEXT,
      premium BOOLEAN,
      is_bot BOOLEAN,
      verified BOOLEAN,
      scam BOOLEAN,
      fake BOOLEAN,
      restricted BOOLEAN,
      status_type TEXT,
      status_until TIMESTAMPTZ,
      status_raw JSONB,
      photo_id TEXT,
      -- Last presence information reported by Telegram.
      last_online_at TIMESTAMPTZ,
      last_online_status TEXT,
      -- Last activity actually observed by our userbot.
      last_activity_at TIMESTAMPTZ,
      last_activity_type TEXT,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
      last_seen_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
      raw_data JSONB,
      CONSTRAINT users_birthday_month_check CHECK (
         birthday_month IS NULL
         OR birthday_month BETWEEN 1 AND 12
      ),
      CONSTRAINT users_birthday_day_check CHECK (
         birthday_day IS NULL
         OR birthday_day BETWEEN 1 AND 31
      )
   );

CREATE INDEX idx_users_last_activity ON users (last_activity_at);

CREATE INDEX idx_users_last_seen ON users (last_seen_at);

-- ============================================================
-- USER SNAPSHOTS
-- Historical snapshots of user profiles
-- ============================================================
CREATE TABLE
   user_snapshots (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      bio TEXT,
      birthday_day SMALLINT,
      birthday_month SMALLINT,
      birthday_year SMALLINT,
      language_code TEXT,
      premium BOOLEAN,
      status_type TEXT,
      status_until TIMESTAMPTZ,
      status_raw JSONB,
      photo_id TEXT,
      last_online_at TIMESTAMPTZ,
      last_online_status TEXT,
      captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
      raw_data JSONB
   );

CREATE INDEX idx_user_snapshots_user_time ON user_snapshots (user_id, captured_at);

-- ============================================================
-- USER EVENTS
-- Exact profile changes and other user-state changes
-- ============================================================
CREATE TABLE
   user_events (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      old_value JSONB,
      new_value JSONB,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
      raw_data JSONB
   );

CREATE INDEX idx_user_events_user_time ON user_events (user_id, occurred_at);

CREATE INDEX idx_user_events_type_time ON user_events (event_type, occurred_at);

-- ============================================================
-- CHATS
-- Current known state of Telegram chats
-- ============================================================
CREATE TABLE
   chats (
      id BIGSERIAL PRIMARY KEY,
      telegram_id BIGINT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      title TEXT,
      username TEXT,
      about TEXT,
      photo_id TEXT,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
      last_seen_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
      raw_data JSONB
   );

CREATE INDEX idx_chats_type ON chats (type);

-- ============================================================
-- CHAT MEMBERS
-- Users actually encountered by the bot in chats
-- ============================================================
CREATE TABLE
   chat_members (
      chat_id BIGINT NOT NULL REFERENCES chats (id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
      last_seen_at TIMESTAMPTZ,
      PRIMARY KEY (chat_id, user_id)
   );

CREATE INDEX idx_chat_members_user ON chat_members (user_id);

-- ============================================================
-- SHIFTS
-- Analytical time intervals
-- ============================================================
CREATE TABLE
   shifts (
      id BIGSERIAL PRIMARY KEY,
      chat_id BIGINT NOT NULL REFERENCES chats (id) ON DELETE CASCADE,
      shift_type TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL,
      ended_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
      CONSTRAINT shifts_time_check CHECK (ended_at > started_at),
      CONSTRAINT shifts_type_check CHECK (shift_type IN ('day', 'night')),
      CONSTRAINT shifts_status_check CHECK (status IN ('active', 'closed')),
      UNIQUE (chat_id, shift_type, started_at)
   );

CREATE INDEX idx_shifts_chat_time ON shifts (chat_id, started_at, ended_at);

-- ============================================================
-- MESSAGES
-- Immutable message journal
-- ============================================================
CREATE TABLE
   messages (
      id BIGSERIAL PRIMARY KEY,
      telegram_id BIGINT NOT NULL,
      chat_id BIGINT NOT NULL REFERENCES chats (id) ON DELETE RESTRICT,
      sender_id BIGINT REFERENCES users (id) ON DELETE RESTRICT,
      date TIMESTAMPTZ NOT NULL,
      edited_at TIMESTAMPTZ,
      deleted_at TIMESTAMPTZ,
      message_type TEXT NOT NULL,
      text TEXT,
      reply_to_message_id BIGINT REFERENCES messages (id) ON DELETE SET NULL,
      forward_from_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
      views BIGINT,
      forwards BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
      raw_data JSONB,
      UNIQUE (chat_id, telegram_id)
   );

CREATE INDEX idx_messages_chat_date ON messages (chat_id, date);

CREATE INDEX idx_messages_sender_date ON messages (sender_id, date);

CREATE INDEX idx_messages_sender_chat_date ON messages (sender_id, chat_id, date);

CREATE INDEX idx_messages_type_date ON messages (message_type, date);

-- ============================================================
-- MESSAGE MEDIA
-- Metadata of files/media attached to messages
-- ============================================================
CREATE TABLE
   message_media (
      id BIGSERIAL PRIMARY KEY,
      message_id BIGINT NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
      media_type TEXT NOT NULL,
      telegram_file_id TEXT,
      file_name TEXT,
      mime_type TEXT,
      file_size BIGINT,
      width INTEGER,
      height INTEGER,
      duration INTEGER,
      raw_data JSONB
   );

CREATE INDEX idx_message_media_message ON message_media (message_id);

CREATE INDEX idx_message_media_type ON message_media (media_type);

-- ============================================================
-- MESSAGE REACTIONS
-- Reaction event history
-- ============================================================
CREATE TABLE
   message_reactions (
      id BIGSERIAL PRIMARY KEY,
      message_id BIGINT NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
      reaction TEXT NOT NULL,
      action TEXT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
      raw_data JSONB,
      CONSTRAINT message_reactions_action_check CHECK (action IN ('add', 'remove', 'change'))
   );

CREATE INDEX idx_message_reactions_message_time ON message_reactions (message_id, occurred_at);

CREATE INDEX idx_message_reactions_user_time ON message_reactions (user_id, occurred_at);

-- ============================================================
-- MESSAGE EDITS
-- Full edit history
-- ============================================================
CREATE TABLE
   message_edits (
      id BIGSERIAL PRIMARY KEY,
      message_id BIGINT NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
      old_text TEXT,
      new_text TEXT,
      edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
      raw_data JSONB
   );

CREATE INDEX idx_message_edits_message_time ON message_edits (message_id, edited_at);

-- ============================================================
-- SHIFT USER STATS
-- Derived/cached statistics for each user in each shift
-- ============================================================
CREATE TABLE
   shift_user_stats (
      shift_id BIGINT NOT NULL REFERENCES shifts (id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      messages BIGINT NOT NULL DEFAULT 0,
      text_messages BIGINT NOT NULL DEFAULT 0,
      photos BIGINT NOT NULL DEFAULT 0,
      videos BIGINT NOT NULL DEFAULT 0,
      voice_messages BIGINT NOT NULL DEFAULT 0,
      audio BIGINT NOT NULL DEFAULT 0,
      documents BIGINT NOT NULL DEFAULT 0,
      stickers BIGINT NOT NULL DEFAULT 0,
      gifs BIGINT NOT NULL DEFAULT 0,
      reactions BIGINT NOT NULL DEFAULT 0,
      replies BIGINT NOT NULL DEFAULT 0,
      forwards BIGINT NOT NULL DEFAULT 0,
      links BIGINT NOT NULL DEFAULT 0,
      calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
      PRIMARY KEY (shift_id, user_id)
   );

CREATE INDEX idx_shift_user_stats_user ON shift_user_stats (user_id);

COMMIT;