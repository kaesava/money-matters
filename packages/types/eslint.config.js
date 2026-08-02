// @ts-check
// Simple ESLint flat config for @money-matters/types
// Uses the root-level @typescript-eslint/parser via monorepo hoisting.
import pluginTs from "@typescript-eslint/eslint-plugin";
import parserTs from "@typescript-eslint/parser";

export default [
  {
    ignores: ["**/*.d.ts", "**/*.d.ts.map", "dist/**"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: parserTs,
    },
    plugins: {
      "@typescript-eslint": pluginTs,
    },
    rules: {
      // ESLint's no-redeclare fires false-positives on Zod const+type patterns:
      //   export const Foo = z.enum([...]);
      //   export type Foo = z.infer<typeof Foo>;
      // TypeScript handles this via the type/value namespace split — disable
      // the base rule and use @typescript-eslint/no-redeclare instead.
      "no-redeclare": "off",
      "@typescript-eslint/no-redeclare": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
