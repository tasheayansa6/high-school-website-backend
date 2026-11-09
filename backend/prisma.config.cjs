require('dotenv').config({ quiet: true });
const { defineConfig } = require('prisma/config');

/**
 * Prisma 7 stores the datasource URL here (not in schema.prisma).
 * Keep a single config file — do not add a second Prisma config.
 */
module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
