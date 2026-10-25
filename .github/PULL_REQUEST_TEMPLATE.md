## 改了什么

<!-- 简要描述本次改动涉及的功能或文件 -->

## 为什么

<!-- 关联 issue（如 Fixes #123），并说明动机与预期效果 -->

## 如何验证

<!-- 列出实际跑过的命令与 App 内手工验证步骤，可附截图 -->

- 单测：`npx jest --config tests/jest.config.unit.js --runTestsByPath <测试文件> --forceExit`
- App 验证（涉及页面 / 数据库 / AI 时必填）：
  1.
  2.

## 检查清单

- [ ] 已阅读 `AGENTS.md`，改动符合分层约定（`pages → api/* → utils/dbService → plus.sqlite`）
- [ ] 已跑相关单测（带 `--forceExit`）并通过；涉及页面或数据库时已在 App 真机/模拟器手工验证
- [ ] 未提交构建产物（`unpackage/` 等）、日志、临时脚本
- [ ] 未包含任何密钥、口令、证书 / keystore（API Key 仅存本地 `ai_config` 表）
- [ ] 新增或修改的页面已在 `pages.json` 注册，并有可达的跳转入口
- [ ] 未修改 `uni_modules/` 下的第三方插件
- [ ] 表结构变更已在 `utils/dbUpgradeConfig.js` 末尾追加新版本（未改动历史脚本）
- [ ] 目录结构、命令或工程约定有变化时，已同步更新 `AGENTS.md`
