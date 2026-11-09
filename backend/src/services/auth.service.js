const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const { comparePassword } = require('../utils/password');
const { signAccessToken } = require('../utils/token');
const { notDeleted } = require('../utils/softDelete');
const { getPermissionsForRoleSlug } = require('../config/roles');

const GENERIC_AUTH_FAILURE = 'Invalid email or password.';

/**
 * Public admin profile for login /me.
 * Portal identity is always `actor: "admin"` — internal RBAC role names
 * (Super Admin, Content Editor, …) are not exposed to clients.
 * Permission checks still use the DB role via middleware.
 */
function toPublicAdmin(admin) {
  return {
    id: admin.id,
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
    isActive: admin.isActive,
    lastLoginAt: admin.lastLoginAt,
    actor: 'admin',
    permissions: getPermissionsForRoleSlug(admin.role.slug),
  };
}

async function findActiveAdminByEmail(email) {
  return prisma.admin.findFirst({
    where: notDeleted({
      email: email.toLowerCase(),
    }),
    include: {
      role: true,
    },
  });
}

async function login({ email, password }) {
  const admin = await findActiveAdminByEmail(email);

  // Constant-ish failure path: always run a compare when possible is hard without a dummy hash.
  // Use a generic message for both unknown email and bad password.
  if (!admin || !admin.isActive) {
    throw new AppError(GENERIC_AUTH_FAILURE, 401, {
      code: 'INVALID_CREDENTIALS',
    });
  }

  const passwordMatches = await comparePassword(password, admin.passwordHash);

  if (!passwordMatches) {
    throw new AppError(GENERIC_AUTH_FAILURE, 401, {
      code: 'INVALID_CREDENTIALS',
    });
  }

  const updatedAdmin = await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
    include: { role: true },
  });

  const accessToken = signAccessToken({
    adminId: updatedAdmin.id,
    tokenVersion: updatedAdmin.tokenVersion,
  });

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: require('../config/env').jwt.expiresIn,
    admin: toPublicAdmin(updatedAdmin),
  };
}

async function getProfile(adminId) {
  const admin = await prisma.admin.findFirst({
    where: notDeleted({ id: adminId }),
    include: { role: true },
  });

  if (!admin || !admin.isActive) {
    throw new AppError('Authentication required.', 401, {
      code: 'UNAUTHORIZED',
    });
  }

  return toPublicAdmin(admin);
}

/**
 * Logout increments tokenVersion so existing JWTs fail authentication.
 * Clients should also discard the token from storage.
 */
async function logout(adminId) {
  const admin = await prisma.admin.findFirst({
    where: notDeleted({ id: adminId }),
  });

  if (!admin || !admin.isActive) {
    throw new AppError('Authentication required.', 401, {
      code: 'UNAUTHORIZED',
    });
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      tokenVersion: { increment: 1 },
    },
  });

  return true;
}

module.exports = {
  login,
  getProfile,
  logout,
  toPublicAdmin,
};
