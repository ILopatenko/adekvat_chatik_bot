const { NewMessage } = require('telegram/events');

const { handleNewMessage } = require('./messageHandler');

const { handleEditedMessage } = require('./messageEditHandler');

const { handleDeletedMessage } = require('./messageDeleteHandler');

function registerTelegramEvents(client) {
   // New messages
   client.addEventHandler(async event => {
      try {
         await handleNewMessage(client, event);
      } catch (error) {
         console.error('Message handler error:', error);
      }
   }, new NewMessage({}));

   // Edited messages
   client.addEventHandler(async update => {
      try {
         await handleEditedMessage(update);
      } catch (error) {
         console.error('Message edit handler error:', error);
      }
   });

   // Deleted messages
   client.addEventHandler(async update => {
      try {
         await handleDeletedMessage(update);
      } catch (error) {
         console.error('Message delete handler error:', error);
      }
   });

   console.log('Telegram event handlers registered');
}

module.exports = {
   registerTelegramEvents,
};
