const multer = require('multer');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.media.maxFileSizeBytes,
    files: 1,
  },
});

function mediaUploadSingle(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(
          new AppError('Uploaded file exceeds the maximum allowed size.', 413, {
            code: 'FILE_TOO_LARGE',
          })
        );
      }

      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(
          new AppError('Unexpected file field. Use field name "file".', 400, {
            code: 'UNEXPECTED_FILE_FIELD',
          })
        );
      }

      return next(
        new AppError('File upload failed.', 400, {
          code: 'UPLOAD_ERROR',
        })
      );
    }

    return next(error);
  });
}

module.exports = mediaUploadSingle;
