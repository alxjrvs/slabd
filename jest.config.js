/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  watchman: false,
  setupFiles: ["<rootDir>/jest.polyfills.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: [
    "<rootDir>/**/__tests__/**/*.(test|spec).(ts|tsx)",
    "<rootDir>/**/*.(test|spec).(ts|tsx)",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/tests/e2e/",
    "/.expo/",
    "/.claude/",
    "/.worktrees/",
  ],
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/$1",
  },
};
