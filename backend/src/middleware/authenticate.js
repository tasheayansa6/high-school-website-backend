const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/token');
const { notDeleted } = require('../utils/softDelete');
const { getPermissionsForRoleSlug } = require('../config/roles');
const asyncHandler = require('./asyncHandler');

function extractBearerToken(req) {
  const header = req.headers.authorization;

  if (!header || typeof header !== 'string') {
    return null;
  }

  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token.trim();
}

function toAuthAdmin(admin) {
  return {
    id: admin.id,
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
    isActive: admin.isActive,
    tokenVersion: admin.tokenVersion,
    lastLoginAt: admin.lastLoginAt,
    role: {
      id: admin.role.id,
      name: admin.role.name,
      slug: admin.role.slug,
    },
    permissions: getPermissionsForRoleSlug(admin.role.slug),
  };
}

const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);

  if (!token) {
    throw new AppError('Authentication required.', 401, {
      code: 'UNAUTHORIZED',
    });
  }

  const payload = verifyAccessToken(token);
  const adminId = Number(payload.sub);

  if (!Number.isInteger(adminId) || adminId <= 0) {
    throw new AppError('Invalid authentication token.', 401, {
      code: 'TOKEN_INVALID',
    });
  }

  const admin = await prisma.admin.findFirst({
    where: notDeleted({ id: adminId }),
    include: {
      role: true,
    },
  });

  if (!admin || !admin.isActive) {
    throw new AppError('Authentication required.', 401, {
      code: 'UNAUTHORIZED',
    });
  }

  if (payload.tokenVersion !== admin.tokenVersion) {
    throw new AppError('Authentication token is no longer valid.', 401, {
      code: 'TOKEN_REVOKED',
    });
  }

  req.admin = toAuthAdmin(admin);
  next();
});

module.exports = authenticate;
