const { pool } = require('./dbConnection');

async function getChatByTelegramId(telegramId) {
   const result = await pool.query(
      `
    SELECT *
    FROM chats
    WHERE telegram_id = $1
    `,
      [telegramId],
   );

   return result.rows[0] || null;
}

async function createChat(data) {
   const result = await pool.query(
      `
    INSERT INTO chats (
      telegram_id,
      type,
      title,
      username,
      about,
      photo_id,
      first_seen_at,
      last_seen_at,
      raw_data
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, NOW(), NOW(), $7
    )
    RETURNING *
    `,
      [
         data.telegram_id,
         data.type,
         data.title,
         data.username,
         data.about,
         data.photo_id,
         data.raw_data,
      ],
   );

   return result.rows[0];
}

async function getOrCreateChat(data) {
   const existingChat = await getChatByTelegramId(data.telegram_id);

   if (existingChat) {
      return existingChat;
   }

   return createChat(data);
}

async function saveMessage(data) {
   const result = await pool.query(
      `
    INSERT INTO messages (
      telegram_id,
      chat_id,
      sender_id,
      date,
      message_type,
      text,
      reply_to_message_id,
      reply_to_telegram_id,
      reply_to_user_id,
      views,
      forwards,
      raw_data
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12
    )
    ON CONFLICT (chat_id, telegram_id)
    DO UPDATE SET
      edited_at = CASE
        WHEN messages.text IS DISTINCT FROM EXCLUDED.text
        THEN NOW()
        ELSE messages.edited_at
      END,
      text = EXCLUDED.text,
      reply_to_telegram_id = EXCLUDED.reply_to_telegram_id,
      reply_to_user_id = EXCLUDED.reply_to_user_id,
      views = EXCLUDED.views,
      forwards = EXCLUDED.forwards,
      raw_data = EXCLUDED.raw_data
    RETURNING *
    `,
      [
         data.telegram_id,
         data.chat_id,
         data.sender_id,
         data.date,
         data.message_type,
         data.text,
         data.reply_to_message_id,
         data.reply_to_telegram_id,
         data.reply_to_user_id,
         data.views,
         data.forwards,
         data.raw_data,
      ],
   );

   return result.rows[0];
}

async function addChatMember(chatId, userId) {
   await pool.query(
      `
    INSERT INTO chat_members (
      chat_id,
      user_id,
      first_seen_at,
      last_seen_at
    )
    VALUES ($1, $2, NOW(), NOW())
    ON CONFLICT (chat_id, user_id)
    DO UPDATE SET
      last_seen_at = NOW()
    `,
      [chatId, userId],
   );
}

async function saveMessageMedia(data) {
   const result = await pool.query(
      `
    INSERT INTO message_media (
      message_id,
      media_type,
      telegram_file_id,
      file_name,
      mime_type,
      file_size,
      width,
      height,
      duration,
      raw_data
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10
    )
    RETURNING *
    `,
      [
         data.message_id,
         data.media_type,
         data.telegram_file_id || null,
         data.file_name || null,
         data.mime_type || null,
         data.file_size || null,
         data.width || null,
         data.height || null,
         data.duration || null,
         data.raw_data || null,
      ],
   );

   return result.rows[0];
}

async function updateMediaDownload(mediaId, localPath, status) {
   const result = await pool.query(
      `
    UPDATE message_media
    SET
      local_path = $2,
      download_status = $3,
      downloaded_at = CASE
        WHEN $3 = 'downloaded'
        THEN NOW()
        ELSE downloaded_at
      END
    WHERE id = $1
    RETURNING *
    `,
      [mediaId, localPath, status],
   );

   return result.rows[0] || null;
}

async function getMessageByTelegramId(chatTelegramId, telegramMessageId) {
   const result = await pool.query(
      `
    SELECT messages.*
    FROM messages
    JOIN chats
      ON chats.id = messages.chat_id
    WHERE chats.telegram_id = $1
      AND messages.telegram_id = $2
    `,
      [chatTelegramId, telegramMessageId],
   );

   return result.rows[0] || null;
}

async function updateEditedMessage(messageId, oldText, newText, rawData) {
   const client = await pool.connect();

   try {
      await client.query('BEGIN');

      await client.query(
         `
      INSERT INTO message_edits (
        message_id,
        old_text,
        new_text,
        edited_at,
        raw_data
      )
      VALUES ($1, $2, $3, NOW(), $4)
      `,
         [messageId, oldText, newText, rawData],
      );

      const result = await client.query(
         `
      UPDATE messages
      SET
        text = $2,
        edited_at = NOW(),
        raw_data = $3
      WHERE id = $1
      RETURNING *
      `,
         [messageId, newText, rawData],
      );

      await client.query('COMMIT');

      return result.rows[0] || null;
   } catch (error) {
      await client.query('ROLLBACK');
      throw error;
   } finally {
      client.release();
   }
}

async function markMessageDeleted(chatTelegramId, telegramMessageId) {
   const result = await pool.query(
      `
    UPDATE messages
    SET deleted_at = NOW()
    WHERE chat_id = (
      SELECT id
      FROM chats
      WHERE telegram_id = $1
    )
    AND telegram_id = $2
    AND deleted_at IS NULL
    RETURNING *
    `,
      [chatTelegramId, telegramMessageId],
   );

   return result.rows[0] || null;
}

module.exports = {
   getChatByTelegramId,
   createChat,
   getOrCreateChat,
   saveMessage,
   saveMessageMedia,
   updateMediaDownload,
   addChatMember,
   getMessageByTelegramId,
   updateEditedMessage,
   markMessageDeleted,
};
