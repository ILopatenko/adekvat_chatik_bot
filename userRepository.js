const { pool } = require('./dbConnection');

async function getUserByTelegramId(telegramId) {
   const result = await pool.query(
      `
    SELECT *
    FROM users
    WHERE telegram_id = $1
    `,
      [telegramId],
   );

   return result.rows[0] || null;
}

async function createUser(data) {
   const result = await pool.query(
      `
    INSERT INTO users (
      telegram_id,
      username,
      first_name,
      last_name,
      phone,
      bio,
      birthday_day,
      birthday_month,
      birthday_year,
      language_code,
      premium,
      is_bot,
      verified,
      scam,
      fake,
      restricted,
      status_type,
      status_until,
      status_raw,
      photo_id,
      last_online_at,
      last_online_status,
      first_seen_at,
      last_seen_at,
      raw_data
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, NOW(), NOW(), $23
    )
    RETURNING *
    `,
      [
         data.telegram_id,
         data.username,
         data.first_name,
         data.last_name,
         data.phone,
         data.bio,
         data.birthday_day,
         data.birthday_month,
         data.birthday_year,
         data.language_code,
         data.premium,
         data.is_bot,
         data.verified,
         data.scam,
         data.fake,
         data.restricted,
         data.status_type,
         data.status_until,
         data.status_raw,
         data.photo_id,
         data.last_online_at,
         data.last_online_status,
         data.raw_data,
      ],
   );

   return result.rows[0];
}

async function updateUser(telegramId, data) {
   const oldUser = await getUserByTelegramId(telegramId);

   if (!oldUser) {
      return createUser(data);
   }

   const fields = [
      'username',
      'first_name',
      'last_name',
      'phone',
      'bio',
      'birthday_day',
      'birthday_month',
      'birthday_year',
      'language_code',
      'premium',
      'is_bot',
      'verified',
      'scam',
      'fake',
      'restricted',
      'status_type',
      'status_until',
      'status_raw',
      'photo_id',
      'last_online_at',
      'last_online_status',
   ];

   for (const field of fields) {
      const oldValue = oldUser[field] ?? null;
      const newValue = data[field] ?? null;

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
         await pool.query(
            `
        INSERT INTO user_events (
          user_id,
          event_type,
          old_value,
          new_value
        )
        VALUES ($1, $2, $3, $4)
        `,
            [oldUser.id, `${field}_changed`, JSON.stringify(oldValue), JSON.stringify(newValue)],
         );
      }
   }

   const result = await pool.query(
      `
    UPDATE users
    SET
      username = $2,
      first_name = $3,
      last_name = $4,
      phone = $5,
      bio = $6,
      birthday_day = $7,
      birthday_month = $8,
      birthday_year = $9,
      language_code = $10,
      premium = $11,
      is_bot = $12,
      verified = $13,
      scam = $14,
      fake = $15,
      restricted = $16,
      status_type = $17,
      status_until = $18,
      status_raw = $19,
      photo_id = $20,
      last_online_at = $21,
      last_online_status = $22,
      last_seen_at = NOW(),
      updated_at = NOW(),
      raw_data = $23
    WHERE telegram_id = $1
    RETURNING *
    `,
      [
         telegramId,
         data.username,
         data.first_name,
         data.last_name,
         data.phone,
         data.bio,
         data.birthday_day,
         data.birthday_month,
         data.birthday_year,
         data.language_code,
         data.premium,
         data.is_bot,
         data.verified,
         data.scam,
         data.fake,
         data.restricted,
         data.status_type,
         data.status_until,
         data.status_raw,
         data.photo_id,
         data.last_online_at,
         data.last_online_status,
         data.raw_data,
      ],
   );

   return result.rows[0];
}

async function updateLastActivity(telegramId, activityType, activityAt = new Date()) {
   const result = await pool.query(
      `
    UPDATE users
    SET
      last_activity_at = $2,
      last_activity_type = $3,
      last_seen_at = $2,
      updated_at = NOW()
    WHERE telegram_id = $1
    RETURNING *
    `,
      [telegramId, activityAt, activityType],
   );

   return result.rows[0] || null;
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
   getUserByTelegramId,
   createUser,
   updateUser,
   updateLastActivity,
   markMessageDeleted,
};
