const mediaService = require('../services/media.service');
const { sendSuccess } = require('../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function upload(req, res) {
  const media = await mediaService.uploadMedia(
    {
      file: req.file,
      metadata: req.validated?.body || {},
    },
    req.admin,
    getRequestMeta(req)
  );

  return sendSuccess(res, {
    status: 201,
    message: 'Media uploaded successfully',
    data: { media },
  });
}

async function listMedia(req, res) {
  const result = await mediaService.listMedia(req.validated.query);
  return sendSuccess(res, {
    message: 'Media assets retrieved',
    data: result,
  });
}

async function getMedia(req, res) {
  const media = await mediaService.getMediaById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, {
    message: 'Media asset retrieved',
    data: { media },
  });
}

async function updateMedia(req, res) {
  const media = await mediaService.updateMedia(
    req.validated.params.id,
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, {
    message: 'Media asset updated',
    data: { media },
  });
}

async function deleteMedia(req, res) {
  const media = await mediaService.softDeleteMedia(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, {
    message: 'Media asset deleted',
    data: { media },
  });
}

async function restoreMedia(req, res) {
  const media = await mediaService.restoreMedia(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, {
    message: 'Media asset restored',
    data: { media },
  });
}

module.exports = {
  upload,
  listMedia,
  getMedia,
  updateMedia,
  deleteMedia,
  restoreMedia,
};
