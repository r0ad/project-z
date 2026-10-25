# 文档索引（doc/）

> 本仓库文档经历过一次目录重构，部分文档写于 `app/` 目录时代，已过时。
> **权威顺序：根目录 `AGENTS.md` > 源码 > `doc/03-design/` > 本目录其余文档。**
> 有冲突时以 `AGENTS.md` 与源码为准；本文件只做导航，不重复规则。

状态图例：✅ 有效 ｜ ⚠️ 部分过时（可参考，以源码为准） ｜ 📦 历史归档 / 参考示例（仅留存，勿照抄）

## 1. 目录总览

| 目录 | 内容 | 状态 |
|---|---|---|
| `00-example/` | uni-app / sqlite / AI 供应商示例代码片段 | 📦 参考示例 |
| `02-UI界面/` | App 设计稿与早期 HTML 原型（含 psd/png 大文件） | 📦 历史设计 |
| `03-design/` | 数据模型、架构设计、推广码设计 | ✅/⚠️ 混合，见 §2 |
| `04-test/` | Jest 测试方案、清单与排错记录（正文未改） | ⚠️ 部分过时 |

## 2. 03-design 文件清单

| 文件 | 说明 | 状态 |
|---|---|---|
| `03-design/01-db.sql` | 15 张表 DDL，数据库结构权威参考（与实现仍有少量偏差） | ✅ |
| `03-design/02-db-upgrade-history.md` | 升级脚本历史（记录到 1.0.0；当前版本见 `utils/dbUpgradeConfig.js` 的 1.1.0） | ⚠️ |
| `03-design/02-design-project.md` | 项目状态 / 进度 / 里程碑 / 日志的更新逻辑设计 | ✅ |
| `03-design/03-design.md` | 早期概要设计（uniapp + Vue3 全貌）；顶部已加 2026-10 修订块，纠正 uView→nutui-uniapp、Pinia→`utils/userStore.js`、日志字段、表清单 10→15、`mine/`→`pages/profile/` 等错误 | ⚠️ |
| `03-design/04-推广码.md` | 推广码（分享码）业务设计 | ✅ |

## 3. 其他目录文件

| 文件 | 说明 | 状态 |
|---|---|---|
| `00-example/AI供应商.md` | AI 供应商枚举示例（实际定义在 `utils/aiProviders.js`） | 📦 |
| `00-example/Sqlite访问例子.md` | plus.sqlite 封装示例（实际封装在 `utils/dbService.js`） | 📦 |
| `00-example/uniapp国际化.md` | uni-app 国际化资料，项目未落地 | 📦 |
| `02-UI界面/项目界面.html`、`知识库、我的界面.html` | 早期静态原型（非源码，不可直接运行） | 📦 |
| `02-UI界面/boot.png`、`boot.psd`、`logo.png`、`应用图标.png` | 启动图 / 图标设计源文件 | 📦 |
| `04-test/README.md`、`README-TESTING.md` | 测试策略总览与完整测试文档 | ⚠️ |
| `04-test/QUICK-REFERENCE.md`、`TESTING-BEST-PRACTICES.md`、`TESTING-CONFIG-EXAMPLES.md`、`TESTING-TROUBLESHOOTING.md` | 测试速查 / 最佳实践 / 配置 / 排错 | ⚠️ |
| `04-test/UNIT-TESTING-SOLUTION.md`、`UNIAPP-JEST-INTEGRATION-SOLUTION.md`、`PROBLEM-SOLUTION-SUMMARY.md`、`QUICK-SOLUTION-SUMMARY.md`、`THINKING-CHAIN-PROCESS.md` | 单元测试 / 集成测试方案与过程记录 | 📦 |
| `04-test/priority/`（`01-product.md`、`P0-core-tests.md`、`P0-TESTING-SUMMARY.md`、`P1-business-tests.md`、`P2-page-tests.md`、`P3-utility-tests.md`） | 测试优先级清单（部分路径仍按旧 `app/` 写） | ⚠️ |

## 4. 我想了解 X → 看哪个文件

| 我想了解 | 看这里 |
|---|---|
| 编码约定、分层铁律、目录地图、运行 / 测试 / 构建 | 根目录 `AGENTS.md`（唯一权威） |
| 产品是什么、如何安装与贡献 | 根目录 `README.md`、`CONTRIBUTING.md` |
| 数据库有哪些表、字段怎么定义 | `03-design/01-db.sql` + `AGENTS.md` §4 |
| 数据库升级脚本怎么写 | `utils/dbUpgradeConfig.js` + `03-design/02-db-upgrade-history.md` |
| 项目 / 里程碑 / 日志的更新逻辑 | `03-design/02-design-project.md` |
| 早期整体设计（架构分层、模块划分） | `03-design/03-design.md`（先读顶部修订块） |
| 推广码机制 | `03-design/04-推广码.md` + `api/promoApi.js` |
| UI 设计稿 / 原型 | `02-UI界面/`（仅参考，不是实现依据） |
| 怎么跑测试、测试怎么写 | `AGENTS.md` §9 + `04-test/README-TESTING.md` |
| 插件 / API 用法示例 | `00-example/`（可能过时，以 `uni_modules/` 与源码为准） |
