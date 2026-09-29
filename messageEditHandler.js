const { getMessageByTelegramId, updateEditedMessage } = require('./messageRepository');

const { telegramToJson } = require('./telegramData');

async function handleEditedMessage(update) {
   if (!update?.className) {
      return;
   }

   if (
      update.className !== 'UpdateEditMessage' &&
      update.className !== 'UpdateEditChannelMessage'
   ) {
      return;
   }

   const message = update.message;

   if (!message) {
      return;
   }

   if (!message.peerId) {
      return;
   }

   const chatTelegramId = message.peerId.channelId
      ? `-100${message.peerId.channelId.toString()}`
      : message.peerId.chatId
        ? `-${message.peerId.chatId.toString()}`
        : message.peerId.userId
          ? message.peerId.userId.toString()
          : null;

   if (!chatTelegramId) {
      return;
   }

   const telegramMessageId = Number(message.id);

   const dbMessage = await getMessageByTelegramId(chatTelegramId, telegramMessageId);

   if (!dbMessage) {
      console.log(
         `Edited message not found: ` + `chat=${chatTelegramId}, ` + `message=${telegramMessageId}`,
      );

      return;
   }

   const oldText = dbMessage.text || null;

   const newText = message.message || null;

   if (oldText === newText) {
      return;
   }

   await updateEditedMessage(dbMessage.id, oldText, newText, telegramToJson(message));

   console.log(`Message edited: ` + `chat=${chatTelegramId}, ` + `message=${telegramMessageId}`);
}

module.exports = {
   handleEditedMessage,
};
