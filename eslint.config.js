import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        ...globals.commonjs
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react": reactPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-undef": "off"
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  },
  {
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**"]
  }
];
