const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { PERMISSIONS } = require('../../config/roles');
const {
  createPageBodySchema,
  updatePageBodySchema,
  adminPageListQuerySchema,
  adminPageSearchQuerySchema,
  pageIdParamSchema,
  adminPageGetQuerySchema,
} = require('../../validators/page.schemas');
const adminPageController = require('../../controllers/adminPage.controller');

const router = express.Router();

const canManagePages = [
  authenticate,
  authorize(PERMISSIONS.PAGES_MANAGE),
];

const canRestorePages = [
  authenticate,
  authorize(PERMISSIONS.PAGES_RESTORE),
];

router.get(
  '/',
  ...canManagePages,
  validate(adminPageListQuerySchema, 'query'),
  asyncHandler(adminPageController.listPages)
);

router.get(
  '/search',
  ...canManagePages,
  validate(adminPageSearchQuerySchema, 'query'),
  asyncHandler(adminPageController.searchPages)
);

router.post(
  '/',
  ...canManagePages,
  validate(createPageBodySchema, 'body'),
  asyncHandler(adminPageController.createPage)
);

router.get(
  '/:id',
  ...canManagePages,
  validate(pageIdParamSchema, 'params'),
  validate(adminPageGetQuerySchema, 'query'),
  asyncHandler(adminPageController.getPage)
);

router.patch(
  '/:id',
  ...canManagePages,
  validate(pageIdParamSchema, 'params'),
  validate(updatePageBodySchema, 'body'),
  asyncHandler(adminPageController.updatePage)
);

router.patch(
  '/:id/publish',
  ...canManagePages,
  validate(pageIdParamSchema, 'params'),
  asyncHandler(adminPageController.publishPage)
);

router.patch(
  '/:id/unpublish',
  ...canManagePages,
  validate(pageIdParamSchema, 'params'),
  asyncHandler(adminPageController.unpublishPage)
);

router.delete(
  '/:id',
  ...canManagePages,
  validate(pageIdParamSchema, 'params'),
  asyncHandler(adminPageController.deletePage)
);

router.patch(
  '/:id/restore',
  ...canRestorePages,
  validate(pageIdParamSchema, 'params'),
  asyncHandler(adminPageController.restorePage)
);

module.exports = router;
