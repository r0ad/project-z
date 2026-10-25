# 打包说明（模板）

> 这是 `package.example.md` 模板，**不要在这里写入真实口令/证书密码**。
> 本地复制为 `package.md` 后填写真实信息；`package.md` 已在 `.gitignore` 中，不会入库。

## 环境

- HBuilderX 最新稳定版（App 开发版）
- 打包目标：Android APK（`app-plus`）

## 打包步骤

1. HBuilderX 打开**仓库根目录**（不是 `uni_modules` 或子目录）。
2. 菜单 `发行 → 原生 App-云打包`（或本地打包）。
3. 选择 Android，使用自己的签名证书：
   - 证书别名：`your-alias`
   - 证书文件：`your-release.keystore`（放在仓库外，例如 `~/keys/`，不要提交）
   - 证书口令：本地保存，不要写入仓库
4. 打包完成后，把生成的 APK 放到 `unpackage/debug/`（该目录已被忽略）或自己的发布渠道。

## 版本号

- `manifest.json` 的 `versionName` / `versionCode` 与 `package.json` 的 `version` 保持一致。
- 发布前同步更新 `versionCode`（整数递增），否则无法覆盖安装。

## 发布产物

- 不要把 APK 提交到仓库；通过 Releases / 对象存储对外分发。
- `intro/version.json` 用于 App 内检查更新（`utils/updateApp.js` 读取），发布时一并更新。
