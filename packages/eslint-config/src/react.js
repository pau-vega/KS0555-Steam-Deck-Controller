module.exports = [
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "react": require("eslint-plugin-react"),
      "react-hooks": require("eslint-plugin-react-hooks"),
      "perfectionist": require("eslint-plugin-perfectionist")
    },
    rules: {
      "perfectionist/sort-imports": "error"
    }
  }
];
