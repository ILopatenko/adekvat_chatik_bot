const cron = require('node-cron');

const { pool } = require('./dbConnection');

const { getOrCreateShift } = require('./shiftService');

const { buildShiftStartMessage, buildShiftClosingMessage } = require('./shiftNotificationService');

const TIME_ZONE = 'America/Los_Angeles';

const CHAT_ID = '-1002618884889';

async function sendShiftStartMessage(client, shiftType) {
   const shift = await getOrCreateShift(BigInt(CHAT_ID));

   if (shift.start_message_sent_at) {
      console.log(`Shift start already sent: ${shiftType}`);

      return;
   }

   const message = buildShiftStartMessage(shiftType);

   await client.sendMessage(CHAT_ID, {
      message,
   });

   await pool.query(
      `
    UPDATE shifts
    SET start_message_sent_at = NOW()
    WHERE id = $1
    `,
      [shift.id],
   );

   console.log(`Shift start message sent: ${shiftType}`);
}

async function sendShiftClosingMessage(client, shiftType) {
   const result = await pool.query(
      `
      SELECT *
      FROM shifts
      WHERE chat_id = (
        SELECT id
        FROM chats
        WHERE telegram_id = $1
      )
      AND shift_type = $2
      AND status = 'active'
      AND closing_message_sent_at IS NULL
      AND ended_at > NOW()
      AND ended_at <= NOW() + INTERVAL '10 minutes'
      ORDER BY ended_at ASC
      LIMIT 1
      `,
      [CHAT_ID, shiftType],
   );

   const shift = result.rows[0];

   if (!shift) {
      console.log(`No shift to close: ${shiftType}`);

      return;
   }

   const message = await buildShiftClosingMessage(shift, shiftType);

   await client.sendMessage(CHAT_ID, {
      message,
   });

   await pool.query(
      `
    UPDATE shifts
    SET
      closing_message_sent_at = NOW(),
      status = 'closed'
    WHERE id = $1
    `,
      [shift.id],
   );

   console.log(`Shift closing message sent: ${shiftType}`);
}

function registerShiftScheduler(client) {
   cron.schedule(
      '0 7 * * *',
      async () => {
         try {
            await sendShiftStartMessage(client, 'day');
         } catch (error) {
            console.error('Day shift start error:', error);
         }
      },
      {
         timezone: TIME_ZONE,
      },
   );

   cron.schedule(
      '0 19 * * *',
      async () => {
         try {
            await sendShiftStartMessage(client, 'night');
         } catch (error) {
            console.error('Night shift start error:', error);
         }
      },
      {
         timezone: TIME_ZONE,
      },
   );

   cron.schedule(
      '55 18 * * *',
      async () => {
         try {
            await sendShiftClosingMessage(client, 'day');
         } catch (error) {
            console.error('Day shift closing error:', error);
         }
      },
      {
         timezone: TIME_ZONE,
      },
   );

   cron.schedule(
      '55 6 * * *',
      async () => {
         try {
            await sendShiftClosingMessage(client, 'night');
         } catch (error) {
            console.error('Night shift closing error:', error);
         }
      },
      {
         timezone: TIME_ZONE,
      },
   );

   console.log(`Shift scheduler registered for chat ${CHAT_ID}`);
}

module.exports = {
   registerShiftScheduler,
};
