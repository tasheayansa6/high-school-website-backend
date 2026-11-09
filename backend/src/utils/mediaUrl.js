const env = require('../config/env');

/**
 * Public API URL for retrieving a media asset's binary content.
 * Uses the cryptographically random publicId — never the numeric PK or storage key.
 */
function buildMediaContentUrl(publicId) {
  return `${env.media.publicBaseUrl}/media/${publicId}/content`;
}

function toFeaturedImagePayload(media) {
  if (!media) {
    return null;
  }

  return {
    id: media.id,
    publicId: media.publicId,
    fileName: media.fileName,
    mimeType: media.mimeType,
    altText: media.altText,
    url: buildMediaContentUrl(media.publicId),
  };
}

module.exports = {
  buildMediaContentUrl,
  toFeaturedImagePayload,
};
