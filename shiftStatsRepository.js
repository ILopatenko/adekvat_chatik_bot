
const { pool } = require("./dbConnection");


async function incrementMessageStats(
  shiftId,
  userId,
  messageType
) {
  const counters = {
    messages: 1,
    text_messages: 0,
    photos: 0,
    videos: 0,
    voice_messages: 0,
    audio: 0,
    documents: 0,
    stickers: 0,
    gifs: 0,
    reactions: 0,
    replies: 0,
    forwards: 0,
    links: 0,
  };

  if (messageType === "text") {
    counters.text_messages = 1;
  }

  if (messageType === "photo") {
    counters.photos = 1;
  }

  if (messageType === "video") {
    counters.videos = 1;
  }

  if (messageType === "voice") {
    counters.voice_messages = 1;
  }

  if (messageType === "audio") {
    counters.audio = 1;
  }

  if (messageType === "document") {
    counters.documents = 1;
  }

  if (messageType === "sticker") {
    counters.stickers = 1;
  }

  if (messageType === "gif") {
    counters.gifs = 1;
  }

  const result = await pool.query(
    `
    INSERT INTO shift_user_stats (
      shift_id,
      user_id,
      messages,
      text_messages,
      photos,
      videos,
      voice_messages,
      audio,
      documents,
      stickers,
      gifs,
      reactions,
      replies,
      forwards,
      links
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15
    )
    ON CONFLICT (
      shift_id,
      user_id
    )
    DO UPDATE SET
      messages = shift_user_stats.messages
        + EXCLUDED.messages,

      text_messages = shift_user_stats.text_messages
        + EXCLUDED.text_messages,

      photos = shift_user_stats.photos
        + EXCLUDED.photos,

      videos = shift_user_stats.videos
        + EXCLUDED.videos,

      voice_messages = shift_user_stats.voice_messages
        + EXCLUDED.voice_messages,

      audio = shift_user_stats.audio
        + EXCLUDED.audio,

      documents = shift_user_stats.documents
        + EXCLUDED.documents,

      stickers = shift_user_stats.stickers
        + EXCLUDED.stickers,

      gifs = shift_user_stats.gifs
        + EXCLUDED.gifs,

      reactions = shift_user_stats.reactions
        + EXCLUDED.reactions,

      replies = shift_user_stats.replies
        + EXCLUDED.replies,

      forwards = shift_user_stats.forwards
        + EXCLUDED.forwards,

      links = shift_user_stats.links
        + EXCLUDED.links,

      calculated_at = NOW()

    RETURNING *
    `,
    [
      shiftId,
      userId,
      counters.messages,
      counters.text_messages,
      counters.photos,
      counters.videos,
      counters.voice_messages,
      counters.audio,
      counters.documents,
      counters.stickers,
      counters.gifs,
      counters.reactions,
      counters.replies,
      counters.forwards,
      counters.links,
    ]
  );

  return result.rows[0];
}


module.exports = {
  incrementMessageStats,
};