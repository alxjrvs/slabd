import expoConfig from "eslint-config-expo/flat.js";

export default [
  ...expoConfig,
  {
    ignores: [
      "node_modules",
      ".expo",
      "dist",
      "ios",
      "android",
      "web-build",
      "**/*.d.ts",
      "playwright-report",
      "test-results",
    ],
  },
  {
    rules: {
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["e2e/detox/**/*.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        afterAll: "readonly",
        afterEach: "readonly",
        expect: "readonly",
      },
    },
  },
];
