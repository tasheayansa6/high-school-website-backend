const AppError = require('../utils/AppError');
const {
  roleHasAllPermissions,
  roleHasAnyPermission,
} = require('../config/roles');

/**
 * Require one or more permissions. Super Admin (`*`) passes all checks.
 * Role/permissions are taken from `req.admin` (loaded from the database).
 */
function authorize(...requiredPermissions) {
  return function authorizeMiddleware(req, res, next) {
    if (!req.admin || !req.admin.role) {
      return next(
        new AppError('Authentication required.', 401, {
          code: 'UNAUTHORIZED',
        })
      );
    }

    const allowed = roleHasAllPermissions(
      req.admin.role.slug,
      requiredPermissions
    );

    if (!allowed) {
      return next(
        new AppError('You do not have permission to perform this action.', 403, {
          code: 'FORBIDDEN',
        })
      );
    }

    return next();
  };
}

/**
 * Require any of the listed permissions.
 */
function authorizeAny(...requiredPermissions) {
  return function authorizeAnyMiddleware(req, res, next) {
    if (!req.admin || !req.admin.role) {
      return next(
        new AppError('Authentication required.', 401, {
          code: 'UNAUTHORIZED',
        })
      );
    }

    const allowed = roleHasAnyPermission(
      req.admin.role.slug,
      requiredPermissions
    );

    if (!allowed) {
      return next(
        new AppError('You do not have permission to perform this action.', 403, {
          code: 'FORBIDDEN',
        })
      );
    }

    return next();
  };
}

/**
 * Require one of the given role slugs.
 */
function requireRoles(...roleSlugs) {
  return function requireRolesMiddleware(req, res, next) {
    if (!req.admin || !req.admin.role) {
      return next(
        new AppError('Authentication required.', 401, {
          code: 'UNAUTHORIZED',
        })
      );
    }

    if (!roleSlugs.includes(req.admin.role.slug)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403, {
          code: 'FORBIDDEN',
        })
      );
    }

    return next();
  };
}

module.exports = {
  authorize,
  authorizeAny,
  requireRoles,
};
