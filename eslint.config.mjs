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
];
