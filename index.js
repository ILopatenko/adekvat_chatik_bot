const { connectTelegram } = require('./tgConnection');
const { connectDatabase } = require('./dbConnection');
const { registerTelegramEvents } = require('./telegramEvents');
const { registerShiftScheduler } = require('./shiftScheduler');

const { registerAdminMenu } = require('./adminMenu');

async function main() {
   const client = await connectTelegram();

   await connectDatabase();

   registerTelegramEvents(client);
   registerShiftScheduler(client);
   registerAdminMenu(client);

   console.log('Userbot is running...');
}

main().catch(console.error);
