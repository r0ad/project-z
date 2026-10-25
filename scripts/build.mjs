/**
 * 命令行构建包装器（CI 与本地通用）：uni-app 工程源码在仓库根目录，
 * 需要把 UNI_INPUT_DIR 指到根目录才能走 `uni build`。
 *
 * 两个必要的处理：
 * 1) vite 配置模板不放根目录（HBuilderX 会误用项目的 vite.config.js，导致发行打包样式异常），
 *    这里在构建前临时复制到根目录，构建结束（成功或失败）都删掉。
 * 2) Windows 上 esbuild 会把较大的输入写到系统临时目录再读回，若该目录被杀软实时扫描占用，
 *    原生 esbuild 删除临时文件会失败并报 `remove C:\...\Temp\esbuild-xxx: Access is denied`；
 *    这里在 win32 下把 TEMP/TMP 指到仓库内的 .tmp/ 绕开扫描。
 *
 * 用法：node scripts/build.mjs app | node scripts/build.mjs h5
 * 产物：dist/build/app（app-plus 资源，供 HBuilderX 离线打包用）、dist/build/h5
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
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

// 临时落地 vite 配置（HBuilderX 会读根目录配置，所以只在 CLI 构建期间存在）
const tempConfig = join(root, 'vite.config.js')
const template = join(root, 'scripts', 'vite.config.template.mjs')
const hadOwnConfig = existsSync(tempConfig)
if (!hadOwnConfig) copyFileSync(template, tempConfig)

const uni = join(root, 'node_modules', '@dcloudio', 'vite-plugin-uni', 'bin', 'uni.js')
let status = 1
try {
  const result = spawnSync(process.execPath, [uni, 'build', '-p', platform], {
    cwd: root,
    env,
    stdio: 'inherit'
  })
  status = result.status ?? 1
} finally {
  if (!hadOwnConfig) rmSync(tempConfig, { force: true })
}
process.exit(status)
