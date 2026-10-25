import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// 这是 HBuilderX 工程，源码在仓库根目录（不是 CLI 模板的 src/）。
// CLI/CI 构建时通过 UNI_INPUT_DIR=. 把输入目录指到根目录，HBuilderX 本身不读这个文件。
export default defineConfig({
  plugins: [uni()]
})
