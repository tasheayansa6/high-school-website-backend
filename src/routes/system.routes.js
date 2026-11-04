const express = require('express');
const validate = require('../middleware/validate');
const { validateExampleBodySchema } = require('../validators');
const { validateExample } = require('../controllers/system.controller');

const router = express.Router();

/**
 * Architecture smoke endpoint for request validation.
 * Not a product feature — safe to remove once module validators exist.
 */
router.post(
  '/validate-example',
  validate(validateExampleBodySchema, 'body'),
  validateExample
);

module.exports = router;
