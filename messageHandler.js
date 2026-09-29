const {
   getUserByTelegramId,
   createUser,
   updateUser,
   updateLastActivity,
} = require('./userRepository');

const {
   getOrCreateChat,
   saveMessage,
   saveMessageMedia,
   updateMediaDownload,
   addChatMember,
} = require('./messageRepository');

const { downloadMedia } = require('./mediaStorage');

const { telegramToJson } = require('./telegramData');

const { getOrCreateShift } = require('./shiftService');

const { incrementMessageStats } = require('./shiftStatsRepository');

async function getUserData(telegramUser) {
   return {
      telegram_id: telegramUser.id.toString(),

      username: telegramUser.username || null,
      first_name: telegramUser.firstName || null,
      last_name: telegramUser.lastName || null,
      phone: telegramUser.phone || null,
      bio: null,

      birthday_day: null,
      birthday_month: null,
      birthday_year: null,

      language_code: telegramUser.langCode || null,

      premium: telegramUser.premium ?? null,
      is_bot: telegramUser.bot ?? false,
      verified: telegramUser.verified ?? false,
      scam: telegramUser.scam ?? false,
      fake: telegramUser.fake ?? false,
      restricted: telegramUser.restricted ?? false,

      status_type: null,
      status_until: null,
      status_raw: null,

      photo_id: telegramUser.photo ? telegramUser.photo.photoId?.toString() || null : null,

      last_online_at: null,
      last_online_status: null,

      raw_data: telegramToJson(telegramUser),
   };
}

function getMessageType(message) {
   if (message.photo) return 'photo';
   if (message.video) return 'video';
   if (message.voice) return 'voice';
   if (message.audio) return 'audio';
   if (message.document) return 'document';
   if (message.sticker) return 'sticker';
   if (message.gif) return 'gif';
   if (message.message) return 'text';

   return 'other';
}

function getMediaData(message, messageType) {
   if (!message.media) {
      return null;
   }

   const data = {
      media_type: messageType,
      telegram_file_id: null,
      file_name: null,
      mime_type: null,
      file_size: null,
      width: null,
      height: null,
      duration: null,
      raw_data: telegramToJson(message.media),
   };

   if (message.photo) {
      data.media_type = 'photo';

      const photo = message.photo;

      if (photo.sizes?.length) {
         const sizes = photo.sizes
            .filter(size => size.w && size.h)
            .sort((a, b) => {
               const areaA = Number(a.w) * Number(a.h);

               const areaB = Number(b.w) * Number(b.h);

               return areaB - areaA;
            });

         if (sizes.length) {
            data.width = Number(sizes[0].w);
            data.height = Number(sizes[0].h);
         }
      }

      return data;
   }

   const document = message.document;

   if (document) {
      data.file_size = document.size ? Number(document.size) : null;

      data.mime_type = document.mimeType || null;

      data.telegram_file_id = document.id?.toString() || null;

      if (document.attributes) {
         for (const attribute of document.attributes) {
            if (attribute.className === 'DocumentAttributeFilename') {
               data.file_name = attribute.fileName || null;
            }

            if (attribute.className === 'DocumentAttributeVideo') {
               data.width = attribute.w ? Number(attribute.w) : null;

               data.height = attribute.h ? Number(attribute.h) : null;

               data.duration = attribute.duration ? Number(attribute.duration) : null;
            }

            if (attribute.className === 'DocumentAttributeAudio') {
               data.duration = attribute.duration ? Number(attribute.duration) : null;
            }
         }
      }

      if (message.video) {
         data.media_type = 'video';
      } else if (message.voice) {
         data.media_type = 'voice';
      } else if (message.audio) {
         data.media_type = 'audio';
      } else if (message.sticker) {
         data.media_type = 'sticker';
      } else {
         data.media_type = 'document';
      }

      return data;
   }

   return data;
}

async function handleNewMessage(client, event) {
   const message = event.message;

   if (!message) return;
   if (message.isPrivate && message.message?.trim() === '/menu') {
      return;
   }
   if (!message.senderId) return;

   let sender;

   try {
      sender = await client.getEntity(message.senderId);
   } catch (error) {
      console.error(`Cannot resolve sender: ${message.senderId.toString()}`);

      return;
   }

   if (!sender || !sender.className?.includes('User')) {
      return;
   }

   const senderTelegramId = sender.id.toString();

   const userData = await getUserData(sender);

   const existingUser = await getUserByTelegramId(senderTelegramId);

   let user;

   if (!existingUser) {
      user = await createUser(userData);

      console.log(`New user: ${senderTelegramId}`);
   } else {
      user = await updateUser(senderTelegramId, userData);
   }

   const chat = await client.getEntity(message.chatId);

   const chatTelegramId = message.chatId.toString();

   const chatData = {
      telegram_id: chatTelegramId,
      type: chat.className || 'unknown',
      title: chat.title || null,
      username: chat.username || null,
      about: null,
      photo_id: null,
      raw_data: telegramToJson(chat),
   };

   const dbChat = await getOrCreateChat(chatData);

   const shift = await getOrCreateShift(dbChat.id);

   await addChatMember(dbChat.id, user.id);

   const messageType = getMessageType(message);

   const messageDate = message.date ? new Date(Number(message.date) * 1000) : new Date();

   let replyToTelegramId = null;
   let replyToUserId = null;

   if (message.replyTo?.replyToMsgId) {
      replyToTelegramId = Number(message.replyTo.replyToMsgId);

      const replyMessage = await message.getReplyMessage();

      if (replyMessage?.senderId) {
         const replySender = await client.getEntity(replyMessage.senderId);

         if (replySender?.id) {
            const replySenderDbUser = await getUserByTelegramId(replySender.id.toString());

            if (replySenderDbUser) {
               replyToUserId = replySenderDbUser.id;
            }
         }
      }
   }

   const savedMessage = await saveMessage({
      telegram_id: Number(message.id),

      chat_id: dbChat.id,

      sender_id: user.id,

      date: messageDate,

      message_type: messageType,

      text: message.message || null,

      reply_to_message_id: null,

      reply_to_telegram_id: replyToTelegramId,

      reply_to_user_id: replyToUserId,

      views: message.views ? Number(message.views) : null,

      forwards: message.forwards ? Number(message.forwards) : null,

      raw_data: telegramToJson(message),
   });

   await incrementMessageStats(shift.id, user.id, messageType);

   const mediaData = getMediaData(message, messageType);

   if (mediaData) {
      const savedMedia = await saveMessageMedia({
         message_id: savedMessage.id,

         ...mediaData,
      });

      try {
         const localPath = await downloadMedia(client, message, messageType);

         await updateMediaDownload(savedMedia.id, localPath, 'downloaded');

         console.log(`Media downloaded: ${localPath}`);
      } catch (error) {
         await updateMediaDownload(savedMedia.id, null, 'failed');

         console.error(`Media download failed: message=${message.id}`, error);
      }
   }

   await updateLastActivity(senderTelegramId, messageType, messageDate);

   console.log(
      `Message saved: chat=${chatTelegramId}, ` +
         `user=${senderTelegramId}, ` +
         `message=${message.id}, ` +
         `type=${messageType}`,
   );
}

module.exports = {
   handleNewMessage,
};
