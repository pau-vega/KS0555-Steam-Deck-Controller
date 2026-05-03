import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/", "node_modules/"]
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "perfectionist/sort-imports": "error"
    }
  }
);
