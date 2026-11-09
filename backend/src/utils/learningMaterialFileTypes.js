/**
 * Detect learning-material file types from magic bytes + claimed extension.
 * Reuses image/PDF signatures; adds Office OLE/OOXML families.
 */

const { detectFileSignature } = require('./fileSignature');

const CATEGORIES = Object.freeze({
  NOTES: 'NOTES',
  HANDOUT: 'HANDOUT',
  SLIDES: 'SLIDES',
  WORKSHEET: 'WORKSHEET',
  ASSIGNMENT_RESOURCE: 'ASSIGNMENT_RESOURCE',
  OTHER: 'OTHER',
});

const ALLOWED_EXTENSIONS = Object.freeze([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'doc',
  'docx',
  'ppt',
  'pptx',
]);

const MIME_BY_EXT = Object.freeze({
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
});

function normalizeExtension(nameOrExt) {
  const raw = String(nameOrExt || '')
    .trim()
    .toLowerCase()
    .replace(/^\./, '');
  const parts = raw.split('.');
  const ext = parts[parts.length - 1] || '';
  return ext === 'jpeg' ? 'jpg' : ext;
}

function isOleCompound(buffer) {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  );
}

function isZipContainer(buffer) {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  );
}

function zipContainsAscii(buffer, needle) {
  return buffer.includes(Buffer.from(needle, 'ascii'));
}

/**
 * @param {Buffer} buffer
 * @param {string} [originalName]
 * @returns {{ mimeType: string, extension: string } | null}
 */
function detectLearningMaterialFile(buffer, originalName) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return null;
  }

  const claimed = normalizeExtension(originalName);
  if (!ALLOWED_EXTENSIONS.includes(claimed) && claimed !== 'jpg') {
    // jpeg normalized to jpg above; allowlist uses jpg
  }

  // Prefer strong signatures shared with CMS media (jpeg/png/pdf).
  const basic = detectFileSignature(buffer);
  if (basic) {
    if (basic.mimeType === 'image/webp') {
      return null; // webp not in learning-material allowlist
    }
    if (basic.mimeType === 'image/jpeg') {
      if (claimed && claimed !== 'jpg' && claimed !== 'jpeg') return null;
      return { mimeType: 'image/jpeg', extension: 'jpg' };
    }
    if (basic.mimeType === 'image/png') {
      if (claimed && claimed !== 'png') return null;
      return { mimeType: 'image/png', extension: 'png' };
    }
    if (basic.mimeType === 'application/pdf') {
      if (claimed && claimed !== 'pdf') return null;
      return { mimeType: 'application/pdf', extension: 'pdf' };
    }
  }

  if (isOleCompound(buffer)) {
    if (claimed === 'doc') {
      return { mimeType: MIME_BY_EXT.doc, extension: 'doc' };
    }
    if (claimed === 'ppt') {
      return { mimeType: MIME_BY_EXT.ppt, extension: 'ppt' };
    }
    return null;
  }

  if (isZipContainer(buffer)) {
    if (claimed === 'docx') {
      if (
        zipContainsAscii(buffer, 'word/') ||
        zipContainsAscii(buffer, '[Content_Types].xml')
      ) {
        return { mimeType: MIME_BY_EXT.docx, extension: 'docx' };
      }
      return null;
    }
    if (claimed === 'pptx') {
      if (
        zipContainsAscii(buffer, 'ppt/') ||
        zipContainsAscii(buffer, '[Content_Types].xml')
      ) {
        return { mimeType: MIME_BY_EXT.pptx, extension: 'pptx' };
      }
      return null;
    }
    return null;
  }

  return null;
}

function isAllowedLearningMaterialExtension(originalName) {
  const ext = normalizeExtension(originalName);
  return ALLOWED_EXTENSIONS.includes(ext) || ext === 'jpeg';
}

module.exports = {
  CATEGORIES,
  ALLOWED_EXTENSIONS,
  MIME_BY_EXT,
  detectLearningMaterialFile,
  isAllowedLearningMaterialExtension,
  normalizeExtension,
};
