/**
 * CLI / CI 构建用的 vite 配置模板。
 *
 * 注意：这个文件**不能**放在项目根目录。HBuilderX（4.x）的编译器只要发现
 * `UNI_INPUT_DIR/vite.config.*` 就会改用项目的这份配置（见 HBuilderX 内置
 * @dcloudio/vite-plugin-uni/dist/cli/utils.js 的 resolveConfigFile），
 * 而这里的 `import uni from '@dcloudio/vite-plugin-uni'` 会解析到项目 node_modules
 * 里为 CLI 安装的版本（4.07），和 HBuilderX 自带的编译器版本混用会导致发行打包样式异常。
 * 所以由 scripts/build.mjs 在构建前临时复制到根目录、构建后删除。
 */
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  css: {
    preprocessorOptions: {
      scss: {
        // nutui-uniapp 与 uni.scss 仍用 @import 旧语法，构建时刷几百行弃用警告，
        // 容易把真正的报错淹掉。这里静音这两类已知告警（升级到 @use 后再打开）。
        quietDeps: true,
        silenceDeprecations: ['import', 'legacy-js-api']
      }
    }
  }
})
