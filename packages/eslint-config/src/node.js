module.exports = [
  {
    files: ["**/*.ts"],
    plugins: {
      "perfectionist": require("eslint-plugin-perfectionist")
    },
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        project: "./tsconfig.json"
      }
    },
    rules: {
      "perfectionist/sort-imports": "error"
    }
  }
];
