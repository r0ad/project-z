import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// 这是 HBuilderX 工程，源码在仓库根目录（不是 CLI 模板的 src/）。
// CLI/CI 构建时通过 UNI_INPUT_DIR=. 把输入目录指到根目录，HBuilderX 本身不读这个文件。
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
