module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['simple-import-sort'],
  rules: {
    'arrow-body-style': ['error', 'as-needed'],
    'func-style': 'error',
    'no-restricted-syntax': ['error', 'VariableDeclaration[kind!="var"]'],
    'object-shorthand': 'error',
    'simple-import-sort/imports': 'error',
  },
};
