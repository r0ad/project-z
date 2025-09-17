/**
 * 端到端测试配置
 * 专门用于端到端测试的 Jest 配置
 */
module.exports = {
  displayName: 'E2E Tests',
  testMatch: ['<rootDir>/tests/e2e/**/*.test.[jt]s?(x)'],
  testEnvironment: '@dcloudio/uni-automator/dist/environment.js',
  globalTeardown: '@dcloudio/uni-automator/dist/teardown.js',
  testEnvironmentOptions: {
    compile: true,
    "app-plus": {
      android: {
        appid: "__UNI__08418DF",
        package: "io.dcloud.UNI08418DF",
        executablePath: "HBuilderX/plugins/launcher/base/android_base.apk"
      },
      ios: {
        id: "",
        executablePath: "HBuilderX/plugins/launcher/base/Pandora_simulator.app"
      }
    }
  },
  testTimeout: 30000, // E2E 测试需要更长时间
  setupFilesAfterEnv: ['<rootDir>/tests/setup/e2e.setup.js']
};
