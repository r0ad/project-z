#!/usr/bin/env node
/**
 * 本地打包后「准备站点发布包」：把 APK 和版本说明打包成可以直接拖进 Netlify 的目录 / zip。
 * 全程不依赖 GitHub（国内访问不了），用户下载始终是 https://project.r0ad.host 。
 *
 * 用法：
 *   node scripts/stage-site.mjs --apk D:\build\app.apk --notes "1. 修复分享码问题"
 *   node scripts/stage-site.mjs --apk ./app.apk --version 1.0.7 --out .\dist-site
 *
 * 做的事：
 *   1) 把 intro/ 复制到 dist-site/（默认，被 .gitignore 忽略）
 *   2) APK 复制成 dist-site/project.apk（站点根目录的固定最新版地址）
 *   3) 生成 dist-site/version.json，最新条目带 downloadUrl = https://project.r0ad.host/project.apk
 *   4) 同步更新仓库里的 intro/version.json（小文件，建议 commit）
 *   5) 默认再压一个 dist-site.zip，Netlify「Deploys → 手动部署」直接拖
 *
 * 参数：
 *   --apk <path>        必填，本地打出来的 APK
 *   --version <x.y.z>   可选，默认取 manifest.json 的 versionName
 *   --notes <text>      可选，更新说明
 *   --date <YYYYMMDD>   可选，默认今天
 *   --out <dir>         可选，默认仓库下 dist-site
 *   --no-zip            不生成 zip
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://project.r0ad.host'

function parseArgs(argv) {
  const args = { zip: true }
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]
    const val = argv[i + 1]
    if (key === '--apk') { args.apk = val; i++ }
    else if (key === '--version') { args.version = val; i++ }
    else if (key === '--notes') { args.notes = val; i++ }
    else if (key === '--date') { args.date = val; i++ }
    else if (key === '--out') { args.out = val; i++ }
    else if (key === '--no-zip') { args.zip = false }
  }
  return args
}

/** manifest.json 是带注释的 JSONC */
function readVersionName() {
  const raw = readFileSync(join(root, 'manifest.json'), 'utf8')
  const clean = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,\s*([}\]])/g, '$1')
  return JSON.parse(clean).versionName
}

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true })
  for (const name of readdirSync(src)) {
    const from = join(src, name)
    const to = join(dest, name)
    if (statSync(from).isDirectory()) copyDir(from, to)
    else copyFileSync(from, to)
  }
}

function updateVersionJson(file, version, notes, date) {
  const list = JSON.parse(readFileSync(file, 'utf8'))
  const idx = list.findIndex(v => v.version === version)
  const entry = {
    version,
    comment: notes || (idx >= 0 ? list[idx].comment : `版本 ${version}`),
    date: idx >= 0 ? list[idx].date : date,
    downloadUrl: `${SITE}/project.apk`
  }
  if (idx >= 0) list[idx] = entry
  else list.push(entry)
  list.sort((a, b) => String(a.version).localeCompare(String(b.version), undefined, { numeric: true }))
  writeFileSync(file, JSON.stringify(list, null, 2) + '\n')
  return list.length
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.apk) {
    console.error('缺少 --apk <本地 APK 路径>')
    process.exit(1)
  }
  const apkPath = resolve(args.apk)
  const version = args.version || readVersionName()
  const now = new Date()
  const date = args.date || `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const outDir = resolve(args.out || join(root, 'dist-site'))

  rmSync(outDir, { recursive: true, force: true })
  copyDir(join(root, 'intro'), outDir)
  copyFileSync(apkPath, join(outDir, 'project.apk'))
  const count = updateVersionJson(join(outDir, 'version.json'), version, args.notes, date)
  updateVersionJson(join(root, 'intro', 'version.json'), version, args.notes, date)

  const apkMb = (statSync(apkPath).size / 1024 / 1024).toFixed(1)
  console.log(`站点目录  ${outDir}`)
  console.log(`APK       ${apkPath}（${apkMb} MB）→ project.apk`)
  console.log(`版本      ${version}（${count} 条历史版本）`)

  let zipPath = ''
  if (args.zip) {
    zipPath = `${outDir}.zip`
    rmSync(zipPath, { force: true })
    try {
      // Windows 自带 tar 也能打 zip；没有的话用 PowerShell 兜底
      execFileSync('tar', ['-a', '-c', '-f', zipPath, '-C', outDir, '.'], { stdio: 'ignore' })
    } catch {
      execFileSync('powershell', ['-NoProfile', '-Command',
        `Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipPath}' -Force`], { stdio: 'ignore' })
    }
    console.log(`部署包    ${zipPath}`)
  }

  console.log(`
下一步（用户下载只走站点，不碰 GitHub）：
  1. Netlify 站点 → Deploys → 把 ${args.zip ? zipPath : outDir} 拖进去（或解压后拖目录）
  2. 提交版本说明：git add intro/version.json && git commit -m "release: v${version}" && git push

发布后用户访问：
  下载页    ${SITE}
  最新版    ${SITE}/project.apk
`)
}

main()
