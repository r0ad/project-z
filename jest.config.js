module.exports = {
	testTimeout: 20000,
	reporters: [
		'default'
	],
	watchPathIgnorePatterns: ['/node_modules/', '/dist/', '/.git/'],
	moduleFileExtensions: ['js', 'json'],
	rootDir: __dirname,
	testMatch: [
		'<rootDir>/tests/**/*test.[jt]s?(x)',
		'<rootDir>/tests/**/*.test.[jt]s?(x)'
	], // 测试文件目录
	testPathIgnorePatterns: ['/node_modules/'],
	setupFilesAfterEnv: ['<rootDir>/tests/setup/unit.setup.js'],
	moduleNameMapping: {
		'^@/(.*)$': '<rootDir>/$1'
	}
}
