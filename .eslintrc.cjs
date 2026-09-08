module.exports = {
	root: true,

	ignorePatterns: ['dist/', 'node_modules/', 'scripts/', '*.config.ts'],

	extends: [
		'@vercel/style-guide/eslint/browser',
		'@vercel/style-guide/eslint/node',
		'@vercel/style-guide/eslint/typescript',
	].map(require.resolve),
	env: {
		es2022: true,
	},
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
		project: './tsconfig.json',
	},
	rules: {
		curly: 0, // ['error', 'multi'],
		'no-bitwise': 0,
		'no-multi-assign': 0,
		'no-implicit-coercion': [
			'error',
			{
				allow: ['~', '+'],
			},
		],

		// Revisit
		'@typescript-eslint/no-confusing-void-expression': 0,
		'@typescript-eslint/prefer-for-of': 0,
		'@typescript-eslint/no-invalid-void-type': 0,

		// Temporary
		'no-console': 0,
		'no-constant-condition': 0,
		'no-extend-native': 0,
		'no-lonely-if': 0,
		// 'no-unused-vars': 0,

		'import/order': 0,
	},
};
