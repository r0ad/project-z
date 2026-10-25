# 项目规范

> 完整约定见根目录 `AGENTS.md`，本文件仅保留速查；冲突时以 `AGENTS.md` 与源码为准。

- 项目设计文档在目录 `./doc` 下。
- 源码在仓库根目录（历史 `app/` 重复副本已于 2026-10 删除），不要把代码写进 `app/`。
- 项目使用sqlite进行数据存储和访问。所有数据操作都需要封装成函数api才在界面调用,存放路径在 `api`，例如项目api `api\projectApi.js`。
- 创建的文件尽可能少。每个文件的功能要单一。
- 所有的设置项都需要在设置界面进行配置。比如gitcode的配置、存储位置的配置、大模型的api、key的配置。

## UI和组件规范

- 使用nutui-uniapp组件库。tabbar使用nutui组件实现。文档地址： <https://nutui-uniapp.pages.dev>
- 界面的所有样式均使用rpx单位布局。rpx 即响应式 px，一种根据屏幕宽度自适应的动态单位。以 750 宽的屏幕为基准，750rpx 恰好为屏幕宽度。
- 大模型交互使用组件 `uni_modules\openai-chat`，使用例子查看 `pages\demo\plugin-example\plugin-example.vue`。
- 文件持久存储使用 `uni_modules\file-manager` 组件。使用例子查看 `pages\demo\file-demo\file-demo.vue`。
- gitcode交互使用组件 `uni_modules\gitcode-sync`，使用例子查看 `pages\demo\gitcode-demo\gitcode-demo.vue`。
- echart组件使用 `uni_modules\qiun-data-charts`，使用文档 `https://www.ucharts.cn/v2/#/guide/index`。

## 开发说明

1. 本项目使用hbuilderx进行开发。不适用npm启动。
