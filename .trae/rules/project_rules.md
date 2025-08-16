# 项目规范

- 项目设计文档在目录 `./doc` 下。
- 项目的所有代码均在 `./app` 目录下。
- 项目使用sqlite进行数据存储和访问。所有数据操作都需要封装成函数api才在界面调用。
- 创建的文件尽可能少。每个文件的功能要单一。
- 所有的设置项都需要在设置界面进行配置。比如gitcode的配置、存储位置的配置、大模型的api、key的配置。

## UI和组件规范

- 使用nutui-uniapp组件库。tabbar使用nutui组件实现。文档地址： <https://nutui-uniapp.pages.dev>
- 界面的所有样式均使用rpx单位布局。rpx 即响应式 px，一种根据屏幕宽度自适应的动态单位。以 750 宽的屏幕为基准，750rpx 恰好为屏幕宽度。
- 大模型交互使用组件 `app\uni_modules\openai-chat`，使用例子查看 `app\pages\demo\plugin-example\plugin-example.vue`。
- 文件持久存储使用 `app\uni_modules\file-manager` 组件。使用例子查看 `app\pages\demo\file-demo\file-demo.vue`。
- gitcode交互使用组件 `app\uni_modules\gitcode-sync`，使用例子查看 `app\pages\demo\gitcode-demo\gitcode-demo.vue`。
- echart组件使用 `app\uni_modules\qiun-data-charts`，使用文档 `https://www.ucharts.cn/v2/#/guide/index`。

## 开发说明

1. 本项目使用hbuilderx进行开发。不适用npm启动。
