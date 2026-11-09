const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

async function comparePassword(plainTextPassword, passwordHash) {
  if (!plainTextPassword || !passwordHash) {
    return false;
  }

  return bcrypt.compare(plainTextPassword, passwordHash);
}

module.exports = {
  hashPassword,
  comparePassword,
};
