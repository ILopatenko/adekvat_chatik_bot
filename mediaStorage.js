const fs = require('fs');
const path = require('path');

const MEDIA_ROOT = path.join(__dirname, 'media');

const MEDIA_DIRS = {
   photo: 'photos',
   video: 'videos',
   voice: 'voice',
   audio: 'audio',
   document: 'documents',
   sticker: 'stickers',
   gif: 'gifs',
   other: 'other',
};

function ensureMediaDirectories() {
   for (const dir of Object.values(MEDIA_DIRS)) {
      fs.mkdirSync(path.join(MEDIA_ROOT, dir), { recursive: true });
   }
}

function getMediaDirectory(mediaType) {
   return MEDIA_DIRS[mediaType] || MEDIA_DIRS.other;
}

function getFileExtension(message, mediaType) {
   if (mediaType === 'photo') {
      return '.jpg';
   }

   if (mediaType === 'voice') {
      return '.ogg';
   }

   if (mediaType === 'sticker') {
      return '.webp';
   }

   if (message.document?.mimeType) {
      const mime = message.document.mimeType;

      const extensions = {
         'video/mp4': '.mp4',
         'audio/mpeg': '.mp3',
         'audio/ogg': '.ogg',
         'audio/mp4': '.m4a',
         'image/jpeg': '.jpg',
         'image/png': '.png',
         'image/webp': '.webp',
         'application/pdf': '.pdf',
      };

      if (extensions[mime]) {
         return extensions[mime];
      }
   }

   return '';
}

async function downloadMedia(client, message, mediaType) {
   ensureMediaDirectories();

   const directory = getMediaDirectory(mediaType);
   const extension = getFileExtension(message, mediaType);

   const fileName = `${message.chatId}_${message.id}${extension}`;

   const relativePath = path.join('media', directory, fileName);

   const absolutePath = path.join(__dirname, relativePath);

   await client.downloadMedia(message, {
      outputFile: absolutePath,
   });

   return relativePath;
}

module.exports = {
   downloadMedia,
   ensureMediaDirectories,
};
