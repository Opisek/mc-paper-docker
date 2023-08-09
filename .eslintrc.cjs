module.exports = {
  "env": {
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "overrides": [],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": [
    "@typescript-eslint"
  ],
  "rules": {
    "indent": [ "error", 2, {
      "SwitchCase": 1
    }],
    "linebreak-style": [ "error", "unix" ],
    "quotes": [ "error", "double" ],
    "semi": [ "error", "always" ],
    "no-multi-spaces": [ "error" ],
    "no-var": 0,
    "comma-dangle": [ "error", "never" ],
    "eol-last": [ "error", "never" ],
    "comma-spacing": [ "error", {
      "before": false,
      "after": true
    }],
    "@typescript-eslint/ban-ts-comment": 0,
    "array-bracket-spacing": [ "error", "always", {
      "objectsInArrays": false,
      "arraysInArrays": false
    }],
    "arrow-parens": [ "error", "as-needed" ],
    "keyword-spacing": [ "error", {
      "before": true,
      "after": true
    }],
    "object-curly-spacing": [ "error", "always", {
      "objectsInObjects": false
    }],
    "no-constant-condition": 0
  },
  "ignorePatterns": [ "entry.js", "dist", "build" ]
};