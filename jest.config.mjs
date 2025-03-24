const config = {
	verbose: true,
	testEnvironment: 'node',
	testRegex: 'src/tests/test.ts',
	transform: {
		'^.+\\.ts?$': ['ts-jest'],
	},
	coveragePathIgnorePatterns: ['src/Logger.ts', 'src/tests'],
	cacheDirectory: '.cache/jest',
};

export default config;
