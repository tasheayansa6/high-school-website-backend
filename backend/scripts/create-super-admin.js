#!/usr/bin/env node
/**
 * Controlled Super Admin bootstrap.
 *
 * Usage:
 *   SUPER_ADMIN_EMAIL=admin@example.com \
 *   SUPER_ADMIN_PASSWORD='StrongPasswordHere!' \
 *   SUPER_ADMIN_FIRST_NAME=Site \
 *   SUPER_ADMIN_LAST_NAME=Admin \
 *   node scripts/create-super-admin.js
 *
 * Or:
 *   npm run admin:create-super
 *
 * Never commit real credentials. This script refuses weak passwords and
 * will not create a duplicate Super Admin email.
 */

const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { DEFAULT_ROLES, ROLE_SLUGS } = require('../src/config/roles');
const { notDeleted } = require('../src/utils/softDelete');

function readRequiredEnv(name) {
  const value = process.env[name];

  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return String(value).trim();
}

function assertStrongPassword(password) {
  if (password.length < 10) {
    throw new Error('SUPER_ADMIN_PASSWORD must be at least 10 characters.');
  }

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error(
      'SUPER_ADMIN_PASSWORD must include at least one letter and one number.'
    );
  }
}

async function ensureRoles() {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: {
        name: role.name,
        description: role.description,
      },
      create: role,
    });
  }
}

async function main() {
  const email = readRequiredEnv('SUPER_ADMIN_EMAIL').toLowerCase();
  const password = readRequiredEnv('SUPER_ADMIN_PASSWORD');
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME?.trim() || 'Super';
  const lastName = process.env.SUPER_ADMIN_LAST_NAME?.trim() || 'Admin';

  assertStrongPassword(password);

  await connectDatabase();
  await ensureRoles();

  const superAdminRole = await prisma.role.findUnique({
    where: { slug: ROLE_SLUGS.SUPER_ADMIN },
  });

  if (!superAdminRole) {
    throw new Error('Super Admin role could not be created.');
  }

  const existing = await prisma.admin.findFirst({
    where: notDeleted({ email }),
  });

  if (existing) {
    throw new Error(
      `An administrator with email "${email}" already exists (id=${existing.id}).`
    );
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.admin.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      isActive: true,
      roleId: superAdminRole.id,
    },
    include: { role: true },
  });

  console.log('Super Admin created successfully.');
  console.log(
    JSON.stringify(
      {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role.slug,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error('Failed to create Super Admin:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
