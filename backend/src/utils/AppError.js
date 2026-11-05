class AppError extends Error {
  /**
   * Operational application error with a safe client-facing message.
   * @param {string} message
   * @param {number} statusCode
   * @param {{ code?: string, errors?: Array<{ field: string, message: string }> }} [options]
   */
  constructor(message, statusCode = 500, options = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = options.code || 'APP_ERROR';
    this.errors = options.errors;
    this.isOperational = true;
  }
}

module.exports = AppError;
