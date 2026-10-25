#!/usr/bin/env node
/**
 * 本地打包（HBuilderX 发行 → 云打包/本地打包）之后，把 APK 发布到 GitHub Releases。
 * 下载页 https://project.r0ad.host 会自动读取 Releases，显示「最新版」和「历史版本」，
 * 其中 project.apk 是固定文件名，.../releases/latest/download/project.apk 永远指向最新版。
 *
 * 用法：
 *   node scripts/publish-release.mjs --apk D:\build\app.apk --notes "1. 修复分享码问题；2. 优化聊天流式"
 *   node scripts/publish-release.mjs --apk ./app.apk --version 1.0.7 --notes "..." --dry-run
 *
 * 参数：
 *   --apk <path>      必填，本地打出来的 APK
 *   --version <x.y.z> 可选，默认取 manifest.json 的 versionName
 *   --notes <text>    可选，更新说明（写进 Release 正文和 intro/version.json）
 *   --tag <vX.Y.Z>    可选，默认 v<version>
 *   --prerelease      标记为预发布（版本号带 - 时自动开启）
 *   --dry-run         只打印将要做的事，不调用 GitHub 写接口
 *
 * GitHub 令牌：优先读环境变量 GITHUB_TOKEN / GH_TOKEN，没有就从 git credential manager 取
 * （Windows 上通常已存过 github.com 的凭据）；需要 repo 权限。
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const repo = process.env.GITHUB_REPOSITORY || 'r0ad/project-z'

function parseArgs(argv) {
  const args = { dryRun: false, prerelease: false }
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]
    const val = argv[i + 1]
    if (key === '--apk') { args.apk = val; i++ }
    else if (key === '--version') { args.version = val; i++ }
    else if (key === '--notes') { args.notes = val; i++ }
    else if (key === '--tag') { args.tag = val; i++ }
    else if (key === '--prerelease') { args.prerelease = true }
    else if (key === '--dry-run') { args.dryRun = true }
    else if (key === '-h' || key === '--help') { args.help = true }
  }
  return args
}

/** manifest.json 是带注释的 JSONC，去掉注释再解析 */
function readManifest() {
  const raw = readFileSync(join(root, 'manifest.json'), 'utf8')
  const clean = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,\s*([}\]])/g, '$1')
  return JSON.parse(clean)
}

/** 从 Windows 凭据管理器 / git credential 取 github.com 令牌（不在日志里打印） */
function tokenFromGitCredential() {
  try {
    const out = execFileSync('git', ['credential', 'fill'], {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' }
    })
    const line = out.split(/\r?\n/).find(l => l.startsWith('password='))
    return line ? line.slice('password='.length) : null
  } catch {
    return null
  }
}

function resolveToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || tokenFromGitCredential()
}

async function api(token, method, path, body, extraHeaders = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'project-z-release-script',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...extraHeaders
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (res.status === 404) return { notFound: true, status: res.status }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} -> HTTP ${res.status}: ${text}`)
  }
  return res.status === 204 ? { status: 204 } : res.json()
}

async function uploadAsset(token, releaseId, filePath, name) {
  const data = readFileSync(filePath)
  const res = await fetch(
    `https://uploads.github.com/repos/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/octet-stream',
        'User-Agent': 'project-z-release-script',
        'Content-Length': String(data.length)
      },
      body: data
    }
  )
  if (!res.ok) throw new Error(`上传 ${name} 失败: HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace('/**', ''))
    return
  }
  if (!args.apk) {
    console.error('缺少 --apk <本地 APK 路径>')
    process.exit(1)
  }

  const apkPath = resolve(args.apk)
  const apkStat = statSync(apkPath)
  const manifest = readManifest()
  const version = args.version || manifest.versionName
  const tag = args.tag || `v${version}`
  const prerelease = args.prerelease || version.includes('-')
  const date = new Date().toISOString().slice(0, 10)
  const ymd = date.replace(/-/g, '')
  const notes = (args.notes || '').trim()

  const sha256 = createHash('sha256').update(readFileSync(apkPath)).digest('hex')
  const sizeMb = (apkStat.size / 1024 / 1024).toFixed(1)
  const body = [
    notes || `版本 ${version}`,
    '',
    '| 文件 | 说明 |',
    '| --- | --- |',
    '| `project.apk` | 最新版固定文件名，`releases/latest/download/project.apk` 始终指向它 |',
    `| \`diandian-${tag}.apk\` | 本版本存档 |`,
    '| `apk.sha256` | SHA256 校验值 |',
    '',
    `版本号 ${version}（versionCode ${manifest.versionCode}），APK ${sizeMb} MB，构建日期 ${date}。`
  ].join('\n')

  console.log(`仓库      ${repo}`)
  console.log(`标签      ${tag}${prerelease ? '（预发布）' : ''}`)
  console.log(`APK       ${apkPath}（${sizeMb} MB）`)
  console.log(`SHA256    ${sha256}`)
  console.log(`说明      ${notes || '(空)'}`)

  if (args.dryRun) {
    const token = resolveToken()
    console.log(`\n[dry-run] 令牌：${token ? '已获取（长度 ' + token.length + '）' : '未获取（正式发布会失败）'}`)
    console.log('[dry-run] 将创建/复用 Release，上传 project.apk、存档 APK、apk.sha256，并更新 intro/version.json')
    return
  }

  const token = resolveToken()
  if (!token) {
    console.error('没有可用的 GitHub 令牌：请设置 GITHUB_TOKEN 环境变量，或先用 git 登录过 github.com')
    process.exit(1)
  }

  // 1) Release：存在就复用，不存在就创建
  let release = await api(token, 'GET', `/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`)
  if (release.notFound) {
    release = await api(token, 'POST', `/repos/${repo}/releases`, {
      tag_name: tag,
      name: tag,
      body,
      draft: false,
      prerelease
    })
    console.log(`已创建 Release ${tag}`)
  } else {
    console.log(`Release ${tag} 已存在，复用并覆盖同名资产`)
  }

  // 2) 资产：同名先删后传，保证 project.apk 始终是最新内容
  const checksumPath = join(dirname(apkPath), 'apk.sha256')
  writeFileSync(checksumPath, `${sha256}  project.apk\n${sha256}  diandian-${tag}.apk\n`)

  const assets = [
    { path: apkPath, name: 'project.apk' },
    { path: apkPath, name: `diandian-${tag}.apk` },
    { path: checksumPath, name: 'apk.sha256' }
  ]
  const existing = (release.assets || []).filter(a => assets.some(x => x.name === a.name))
  for (const asset of existing) {
    await api(token, 'DELETE', `/repos/${repo}/releases/assets/${asset.id}`)
    console.log(`已删除旧资产 ${asset.name}`)
  }
  for (const asset of assets) {
    const uploaded = await uploadAsset(token, release.id, asset.path, asset.name)
    console.log(`已上传 ${uploaded.name}（${(uploaded.size / 1024 / 1024).toFixed(1)} MB）`)
  }

  // 3) 更新 intro/version.json，下载页的更新日志立即有新条目（已存在版本保留原发布日期）
  const versionJsonPath = join(root, 'intro', 'version.json')
  const list = JSON.parse(readFileSync(versionJsonPath, 'utf8'))
  const idx = list.findIndex(v => v.version === version)
  const entry = {
    version,
    comment: notes || (idx >= 0 ? list[idx].comment : `版本 ${version}`),
    date: idx >= 0 ? list[idx].date : ymd
  }
  if (idx >= 0) list[idx] = entry
  else list.push(entry)
  list.sort((a, b) => String(a.version).localeCompare(String(b.version), undefined, { numeric: true }))
  writeFileSync(versionJsonPath, JSON.stringify(list, null, 2) + '\n')
  console.log(`已更新 intro/version.json（${version}）`)

  console.log(`
完成。接下来把版本说明一起推上去，下载页就会显示新版本：
  git add intro/version.json
  git commit -m "release: ${tag}"
  git push

下载地址：
  最新版    https://github.com/${repo}/releases/latest/download/project.apk
  本版本    https://github.com/${repo}/releases/download/${tag}/diandian-${tag}.apk
  下载页    https://project.r0ad.host
`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
