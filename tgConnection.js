require('dotenv').config();

const fs = require('fs');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');

const API_ID = Number(process.env.API_ID);
const API_HASH = process.env.API_HASH;
const PHONE_NUMBER = '+57 322 754 1733';

const SESSION_FILE = 'telegram.session';

async function connectTelegram() {
   let session = '';

   if (fs.existsSync(SESSION_FILE)) {
      session = fs.readFileSync(SESSION_FILE, 'utf8');
   }

   const client = new TelegramClient(new StringSession(session), API_ID, API_HASH, {
      connectionRetries: 5,
   });

   await client.start({
      phoneNumber: async () => PHONE_NUMBER,
      password: async () => await input.text('2FA password: '),
      phoneCode: async () => await input.text('Telegram code: '),
      onError: error => console.error(error),
   });

   fs.writeFileSync(SESSION_FILE, client.session.save());

   const me = await client.getMe();

   console.log(`Connected as: ${me.firstName || ''} (${me.id})`);

   return client;
}

module.exports = {
   connectTelegram,
};
