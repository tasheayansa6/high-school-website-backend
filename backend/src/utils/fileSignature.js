/**
 * Detect file type from magic bytes. Do not trust client MIME or extension.
 *
 * Intentionally excluded (active / high-risk content): SVG, HTML, XML, GIF
 * animations with scriptable payloads, Office macros, executables, archives.
 */

const SIGNATURES = Object.freeze([
  {
    mimeType: 'image/jpeg',
    extension: 'jpg',
    match: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  {
    mimeType: 'image/png',
    extension: 'png',
    match: (buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
  {
    mimeType: 'image/webp',
    extension: 'webp',
    match: (buffer) =>
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP',
  },
  // School circulars / forms often need PDF delivery on the public site.
  {
    mimeType: 'application/pdf',
    extension: 'pdf',
    match: (buffer) =>
      buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-',
  },
]);

const ALLOWED_MIME_TYPES = Object.freeze(SIGNATURES.map((item) => item.mimeType));

function detectFileSignature(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return null;
  }

  return SIGNATURES.find((item) => item.match(buffer)) || null;
}

module.exports = {
  ALLOWED_MIME_TYPES,
  detectFileSignature,
};
