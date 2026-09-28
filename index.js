require('dotenv').config();

const fs = require('fs');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const input = require('input');

const API_ID = Number(process.env.API_ID);
const API_HASH = process.env.API_HASH;
const OWNER_ID = '8910735441';

const SESSION_FILE = 'telegram.session';

let session = '';

if (fs.existsSync(SESSION_FILE)) {
   session = fs.readFileSync(SESSION_FILE, 'utf8');
}

const client = new TelegramClient(new StringSession(session), API_ID, API_HASH, {
   connectionRetries: 5,
});

async function main() {
   await client.start({
      phoneNumber: async () => await input.text('Phone number: '),
      password: async () => await input.text('2FA password: '),
      phoneCode: async () => await input.text('Telegram code: '),
      onError: error => console.error(error),
   });

   fs.writeFileSync(SESSION_FILE, client.session.save());

   const me = await client.getMe();

   console.log('Connected!');
   console.log(`Logged in as: ${me.firstName || ''}`);
   console.log(`Telegram ID: ${me.id}`);
   console.log(`Owner ID: ${OWNER_ID}`);
   console.log('Waiting for messages...');

   client.addEventHandler(async event => {
      const message = event.message;

      if (!message) {
         return;
      }

      if (!message.isPrivate) {
         return;
      }

      const senderId = message.senderId?.toString();

      console.log(`Message from: ${senderId}`);

      if (senderId !== OWNER_ID) {
         await message.reply({
            message: 'Ты Кто Такой?',
         });
         return;
      }

      if (!message.message) {
         return;
      }

      console.log(`Owner: ${message.message}`);

      await message.reply({
         message: 'Привет! Я тебя вижу 👋',
      });
   }, new NewMessage({}));
}

main().catch(console.error);
