/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/dist-test/tests/**/*.test.js'],
  testTimeout: 20000,
};
