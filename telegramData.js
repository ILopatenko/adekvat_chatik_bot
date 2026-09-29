function toPlainObject(value, seen = new WeakSet()) {
   if (value === null || value === undefined) {
      return value;
   }

   if (typeof value === 'bigint') {
      return value.toString();
   }

   if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
   }

   if (value instanceof Date) {
      return value.toISOString();
   }

   if (typeof value !== 'object') {
      return String(value);
   }

   if (seen.has(value)) {
      return '[Circular]';
   }

   seen.add(value);

   if (Array.isArray(value)) {
      return value.map(item => toPlainObject(item, seen));
   }

   const result = {};

   for (const [key, item] of Object.entries(value)) {
      if (key === '_client') {
         continue;
      }

      if (typeof item === 'function') {
         continue;
      }

      result[key] = toPlainObject(item, seen);
   }

   return result;
}

function telegramToJson(value) {
   return toPlainObject(value);
}

module.exports = {
   telegramToJson,
};
