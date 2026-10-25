/**
 * 命令行构建包装器（CI 与本地通用）：uni-app 工程源码在仓库根目录，
 * 需要把 UNI_INPUT_DIR 指到根目录才能走 `uni build`。
 *
 * 为什么要包一层：Windows 上 esbuild 会把较大的输入写到系统临时目录再读回，
 * 若该目录被杀毒软件实时扫描占用，原生 esbuild 删除临时文件会失败并报
 * `remove C:\...\Temp\esbuild-xxx: Access is denied`，构建直接中断。
 * 这里在 win32 下把 TEMP/TMP 指到仓库内的 .tmp/（已被 .gitignore 忽略）绕开扫描。
 *
 * 用法：node scripts/build.mjs app | node scripts/build.mjs h5
 * 产物：dist/build/app（app-plus 资源，供 HBuilderX 离线打包用）、dist/build/h5
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const platform = process.argv[2]
if (!platform) {
  console.error('用法: node scripts/build.mjs <app|h5>')
  process.exit(1)
}

const env = { ...process.env, UNI_INPUT_DIR: '.', NODE_ENV: 'production' }
if (process.platform === 'win32') {
  const tmp = join(root, '.tmp')
  mkdirSync(tmp, { recursive: true })
  env.TEMP = tmp
  env.TMP = tmp
}

const uni = join(root, 'node_modules', '@dcloudio', 'vite-plugin-uni', 'bin', 'uni.js')
const result = spawnSync(process.execPath, [uni, 'build', '-p', platform], {
  cwd: root,
  env,
  stdio: 'inherit'
})
process.exit(result.status ?? 1)
