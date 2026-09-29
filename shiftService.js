const { pool } = require('./dbConnection');

const TIME_ZONE = 'America/Los_Angeles';

function getLosAngelesDateParts(date = new Date()) {
   const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
   });

   const parts = formatter.formatToParts(date);
   const values = {};

   for (const part of parts) {
      if (part.type !== 'literal') {
         values[part.type] = part.value;
      }
   }

   return {
      year: Number(values.year),
      month: Number(values.month),
      day: Number(values.day),
      hour: Number(values.hour),
      minute: Number(values.minute),
      second: Number(values.second),
   };
}

function getShiftType(date = new Date()) {
   const { hour } = getLosAngelesDateParts(date);

   return hour >= 7 && hour < 19 ? 'day' : 'night';
}

function getShiftStart(date = new Date()) {
   const parts = getLosAngelesDateParts(date);
   const shiftType = getShiftType(date);
   const startHour = shiftType === 'day' ? 7 : 19;

   let year = parts.year;
   let month = parts.month;
   let day = parts.day;

   if (shiftType === 'night' && parts.hour < 7) {
      const previous = new Date(Date.UTC(year, month - 1, day));

      previous.setUTCDate(previous.getUTCDate() - 1);

      year = previous.getUTCFullYear();
      month = previous.getUTCMonth() + 1;
      day = previous.getUTCDate();
   }

   const localDateTime =
      `${year}-${String(month).padStart(2, '0')}-` +
      `${String(day).padStart(2, '0')}T` +
      `${String(startHour).padStart(2, '0')}:00:00`;

   return localToUtc(localDateTime);
}

function localToUtc(localDateTime) {
   const [datePart, timePart] = localDateTime.split('T');

   const [year, month, day] = datePart.split('-').map(Number);

   const [hour, minute, second] = timePart.split(':').map(Number);

   const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

   const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      timeZoneName: 'longOffset',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
   }).formatToParts(guess);

   const offset = parts.find(part => part.type === 'timeZoneName')?.value;

   const match = offset?.match(/GMT([+-])(\d{2}):(\d{2})/);

   if (!match) {
      return guess;
   }

   const sign = match[1] === '+' ? 1 : -1;

   const offsetMinutes = sign * (Number(match[2]) * 60 + Number(match[3]));

   return new Date(guess.getTime() - offsetMinutes * 60 * 1000);
}

async function getOrCreateShift(chatId, date = new Date()) {
   const shiftType = getShiftType(date);
   const startedAt = getShiftStart(date);

   const endedAt = new Date(startedAt.getTime() + 12 * 60 * 60 * 1000);

   const result = await pool.query(
      `
    INSERT INTO shifts (
      chat_id,
      shift_type,
      started_at,
      ended_at,
      status
    )
    VALUES ($1, $2, $3, $4, 'active')
    ON CONFLICT (
      chat_id,
      shift_type,
      started_at
    )
    DO UPDATE SET
      status = 'active'
    RETURNING *
    `,
      [chatId, shiftType, startedAt, endedAt],
   );

   return result.rows[0];
}

module.exports = {
   getShiftType,
   getShiftStart,
   getOrCreateShift,
};
