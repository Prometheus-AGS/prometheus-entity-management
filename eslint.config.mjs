import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

const hookRules = reactHooks.configs.flat.recommended;

export default tseslint.config(
  {
    ignores: [
      "**/coverage/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/.dart_tool/**",
      "**/target/**",
      "packages/entity-graph-tauri/src/generated-bindings.ts",
      "tests/fixtures/tauri-plugin-host/fixtures/contract.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["packages/**/*.{ts,tsx}", "examples/**/*.{ts,tsx}"],
    plugins: hookRules.plugins,
    rules: {
      "react-hooks/rules-of-hooks": hookRules.rules["react-hooks/rules-of-hooks"],
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    files: ["examples/vite-app/**/*.{ts,tsx}"],
    plugins: reactRefresh.configs.vite.plugins,
    rules: {
      ...reactRefresh.configs.vite.rules,
      "react-refresh/only-export-components": "off",
    },
  },
);
