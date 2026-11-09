const mediaService = require('../services/media.service');

function safeContentDispositionFilename(fileName) {
  return String(fileName || 'file')
    .replace(/["\\\r\n]/g, '')
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 180) || 'file';
}

function dispositionForMime(mimeType) {
  // Prefer attachment for non-image types to reduce unexpected inline execution.
  if (typeof mimeType === 'string' && mimeType.startsWith('image/')) {
    return 'inline';
  }
  return 'attachment';
}

async function streamMediaContent(req, res, next) {
  try {
    const { stream, mimeType, fileSize, fileName } = await mediaService.getPublicMediaContent(
      req.validated.params.publicId
    );

    const safeName = safeContentDispositionFilename(fileName);
    const disposition = dispositionForMime(mimeType);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', String(fileSize));
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Referrer-Policy', 'no-referrer');

    stream.on('error', (error) => next(error));
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  streamMediaContent,
};
