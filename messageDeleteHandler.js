const { markMessageDeleted } = require('./messageRepository');

function getChatTelegramId(update) {
   if (update.className === 'UpdateDeleteChannelMessages') {
      return `-100${update.channelId.toString()}`;
   }

   if (update.className === 'UpdateDeleteMessages') {
      return null;
   }

   return null;
}

async function handleDeletedMessage(update) {
   if (!update?.className) {
      return;
   }

   if (
      update.className !== 'UpdateDeleteMessages' &&
      update.className !== 'UpdateDeleteChannelMessages'
   ) {
      return;
   }

   const messageIds = update.messages || [];

   const chatTelegramId = getChatTelegramId(update);

   // Regular private/group chats.
   // Telegram does not include chat_id in
   // UpdateDeleteMessages, so we resolve the
   // message through all known chats later.
   if (!chatTelegramId) {
      console.log('Deleted messages in regular chat:', messageIds);

      return;
   }

   for (const messageId of messageIds) {
      const deletedMessage = await markMessageDeleted(chatTelegramId, Number(messageId));

      if (deletedMessage) {
         console.log(`Message deleted: ` + `chat=${chatTelegramId}, ` + `message=${messageId}`);
      }
   }
}

module.exports = {
   handleDeletedMessage,
};
