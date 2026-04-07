module.exports = [
  {
    ignores: [
      'node_modules/**',
      'logs/**',
      'uploads/**',
      'coverage/**',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },
    rules: {},
  },
];
