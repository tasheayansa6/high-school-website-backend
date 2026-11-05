const express = require('express');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { PERMISSIONS } = require('../../config/roles');
const { sendSuccess } = require('../../utils/apiResponse');

const router = express.Router();

/**
 * Permission probe endpoints for authorization checks (no business logic).
 * Useful for tests and for the frontend to verify role wiring.
 */
router.get(
  '/content',
  authenticate,
  authorize(PERMISSIONS.PAGES_MANAGE),
  (req, res) =>
    sendSuccess(res, {
      message: 'Content access granted',
      data: {
        permission: PERMISSIONS.PAGES_MANAGE,
        adminId: req.admin.id,
        role: req.admin.role.slug,
      },
    })
);

router.get(
  '/communications',
  authenticate,
  authorize(PERMISSIONS.CONTACT_MANAGE),
  (req, res) =>
    sendSuccess(res, {
      message: 'Communications access granted',
      data: {
        permission: PERMISSIONS.CONTACT_MANAGE,
        adminId: req.admin.id,
        role: req.admin.role.slug,
      },
    })
);

router.get(
  '/settings',
  authenticate,
  authorize(PERMISSIONS.SETTINGS_MANAGE),
  (req, res) =>
    sendSuccess(res, {
      message: 'Settings access granted',
      data: {
        permission: PERMISSIONS.SETTINGS_MANAGE,
        adminId: req.admin.id,
        role: req.admin.role.slug,
      },
    })
);

module.exports = router;
