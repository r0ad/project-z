/**
 * 集成测试配置
 * 专门用于集成测试的 Jest 配置
 */
module.exports = {
  displayName: 'Integration Tests',
  testMatch: ['<rootDir>/tests/integration/**/*.test.[jt]s?(x)'],
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
  testTimeout: 20000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.setup.js']
};
