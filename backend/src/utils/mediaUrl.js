const env = require('../config/env');

/**
 * Public API URL for retrieving a media asset's binary content.
 * Never expose absolute filesystem paths to clients.
 */
function buildMediaContentUrl(mediaId) {
  return `${env.media.publicBaseUrl}/media/${mediaId}/content`;
}

function toFeaturedImagePayload(media) {
  if (!media) {
    return null;
  }

  return {
    id: media.id,
    fileName: media.fileName,
    mimeType: media.mimeType,
    altText: media.altText,
    url: buildMediaContentUrl(media.id),
  };
}

module.exports = {
  buildMediaContentUrl,
  toFeaturedImagePayload,
};
