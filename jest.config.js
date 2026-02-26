const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const config = {
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  testEnvironment: 'node',
};

module.exports = createJestConfig(config);
