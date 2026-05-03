import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: ["dist/", "node_modules/"]
  },
  ...tseslint.configs.recommendedTypeChecked,
  react.configs.recommended,
  reactHooks.configs.recommended,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "perfectionist/sort-imports": "error"
    }
  }
);
