const crypto = require('crypto');

/**
 * Cryptographically secure public media identifier (32 hex chars).
 * Not derived from the numeric primary key.
 */
function generateMediaPublicId() {
  return crypto.randomBytes(16).toString('hex');
}

function isMediaPublicId(value) {
  return typeof value === 'string' && /^[a-f0-9]{32}$/i.test(value.trim());
}

module.exports = {
  generateMediaPublicId,
  isMediaPublicId,
};
