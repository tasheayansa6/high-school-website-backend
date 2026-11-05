const mediaService = require('../services/media.service');

async function streamMediaContent(req, res, next) {
  try {
    const { stream, mimeType, fileSize, fileName } = await mediaService.getPublicMediaContent(
      req.validated.params.id
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', String(fileSize));
    res.setHeader('Content-Disposition', `inline; filename="${fileName.replace(/"/g, '')}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    stream.on('error', (error) => next(error));
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  streamMediaContent,
};
