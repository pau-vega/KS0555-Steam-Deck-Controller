module.exports = [
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "react": require("eslint-plugin-react"),
      "react-hooks": require("eslint-plugin-react-hooks"),
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
