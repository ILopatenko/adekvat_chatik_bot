const { NewMessage } = require('telegram/events');
const { Button } = require('telegram/tl/custom/button');
const OWNER_ID = '8910735440';
function callbackButton(text, data) {
   const button = Button.inline(text, data);
   button.data = Buffer.from(data);
   return button;
}
function registerAdminMenu(client) {
   client.addEventHandler(async event => {
      try {
         const message = event.message;
         if (!message) return;
         if (message.senderId?.toString() !== OWNER_ID) {
            return;
         }
         if (message.isPrivate !== true) {
            return;
         }
         if (message.message?.trim() !== '/menu') {
            return;
         }
         await message.reply({
            message: '🤖 **Админ-панель**\n\n' + 'Выбери нужный раздел:',
            buttons: [
               [
                  callbackButton('📊 Статистика', 'admin_stats'),
                  callbackButton('📋 Задания', 'admin_tasks'),
               ],
               [
                  callbackButton('⚙️ Настройки', 'admin_settings'),
                  callbackButton('🔄 Обновить', 'admin_refresh'),
               ],
               [callbackButton('❌ Закрыть', 'admin_close')],
            ],
         });
      } catch (error) {
         console.error('Admin menu error:', error);
      }
   }, new NewMessage({}));
   console.log('Admin menu registered');
}
module.exports = { registerAdminMenu };
