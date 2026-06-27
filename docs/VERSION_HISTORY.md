# GameBalanceTool V3 版本历史

## 版本号规则

项目统一使用语义版本号：`MAJOR.MINOR.PATCH`。

| 层级 | 递增条件 | 示例 |
|---|---|---|
| `MAJOR` 主版本 | 数据结构或核心架构不兼容，需要迁移说明 | `4.0.0` |
| `MINOR` 功能版本 | 新增可见功能、核心模块、页面级能力，兼容旧数据 | `3.7.0` |
| `PATCH` 修订版本 | Bug 修复、UI 微调、文案修正、测试补齐，不改变功能边界 | `3.7.1` |

维护规则：
- 当前版本单一来源为 `src/core/project-versioning.js` 的 `PROJECT_VERSION`。
- 页面头部、导出文件名、工程封包、导入迁移目标、测试断言都必须跟随 `PROJECT_VERSION`。
- 每次本地验收通过并同步 GitHub 前，若变更属于功能版本或修订版本，必须先更新本文件。
- Git 标签建议使用 `vX.Y.Z`，例如 `v3.7.0`。

## v3.7.0 - 界面维护版

目标：建立可持续维护的版本号规则，并把近期已验收的付费模拟、战斗演算、属性同步和 UI 折叠能力纳入新的维护基线。

核心变更：

| 模块 | 变更 |
|---|---|
| 版本体系 | 当前版本升级为 `3.7.0`，页面头部显示 `v3.7.0` 与版本名 |
| 工程封包 | `PROJECT_VERSION` 作为导入导出和迁移目标的单一版本源 |
| 付费模拟 | 新增玩家分层、礼包 ROI、复购意愿、付费优势和风险标签评估 |
| 战斗演算 | 沙盘对决改为双方回合制出手，守方目标属性可独立编辑 |
| 属性来源 | 依赖属性的 UI 从“属性与权重”同步生成，支持属性增减联动 |
| UI 表单 | 表单改为左 label、右输入控件布局，长 label 精简 |
| 页面折叠 | `class="section"` 支持展开/收起，每页前三个默认展开，超过三个默认收起 |

验证范围：
- `npm test`
- JS 语法检查
- 浏览器布局采样和战斗/付费/养成页烟测

## v3.6 - Project 多方案与版本化工程

目标：解决项目数据可导出、可导入、可迁移的问题，并让 ROI/Simulator 的多方案配置从 UI 写死逻辑升级为工程数据。

核心新增：

| 文件 | 说明 |
|---|---|
| `src/core/project-versioning.js` | 定义 `gbt-project` 工程封包、版本号、导入迁移入口和 Project Scenario 工具函数 |
| `src/ui/project-scenario-panel.js` | 新增多方案管理面板，支持新增、编辑、删除、设为当前方案 |

关键改造：

| 模块 | 改造点 |
|---|---|
| `src/core/project-state.js` | 版本升级到 `3.6.0`，`snapshot/restore` 改为版本化入口 |
| `src/export/io.js` | 增加版本化导入导出，保留旧入口兼容 |
| `src/ui/simulator-panel.js` | ROI 初始化和多方案模拟读取 Project Scenarios |
| `src/index-loader.js` | 导入导出按钮接入 v3.6 工程封包 |

兼容范围：

- v3.6 `gbt-project` 工程封包
- v3.1 `gbt-project-state` 快照
- v3 旧快照中的 `v2State.data`
- 部分 v2.1 数据结构

## v3.5 - ROI Strategy Engine 与多方案模拟器

目标：把 ROI 投资模拟从页面逻辑中拆出，形成可复用的 ROI Strategy Engine，并为后续 A/B/C 方案比较准备数据结构。

核心新增：

| 文件 | 说明 |
|---|---|
| `src/engine/roi-strategy.js` | ROI 状态、投资、自动分配、天数推进、策略模拟、摘要输出 |

内置策略：

| 策略 | 说明 |
|---|---|
| 当前手动方案 | 当前用户实际点击结果 |
| 智能 ROI 最优 | 每次选择单位成本收益最高的分支 |
| 均衡补短板 | 优先补低等级分支，再比较 ROI |
| 单点集中堆叠 | 集中堆叠第一个分支，用于验证边际递减 |
| 低成本铺量 | 优先升级低成本分支 |

多方案模拟器增加小 R 试探、标准预算、均衡方案、大 R 拉满等预算档位对比。

## v3.4 - Simulator 数据源统一与分支成长表

目标：

1. Simulator 和 ROI 不再直接依赖 `index.html` 内部临时状态。
2. 分支等级成长明细表从页面逻辑中拆出，成为可复用模块。

核心新增：

| 文件 | 说明 |
|---|---|
| `src/engine/simulator.js` | 生命周期模拟器 |
| `src/ui/simulator-panel.js` | 接管模拟器和 ROI 面板全局函数 |
| `src/ui/branch-growth-table.js` | 分支等级成长明细表 |

关键原则：

- 模拟器数据统一从 `ProjectState.get()` 读取，回退兼容 `window.S`。
- 曲线计算统一调用 `calculateCurveValue(curve, level)`。
- ROI 相关全局函数由 V3 模块覆盖旧 `index.html` 函数。

## v3.3 - 养成分支编辑器模块化

目标：

1. 将养成系统二级分支编辑器从 `index.html` 内联逻辑中拆出。
2. 将曲线绑定下拉框统一为可复用组件。

核心新增：

| 文件 | 说明 |
|---|---|
| `src/ui/components/curve-binding.js` | 曲线选择、曲线名称、曲线对象读取、HTML 转义 |
| `src/ui/cultivation-branch-editor.js` | 分支弹窗、消耗行、属性行、预览、保存、删除 |

关键修复：

- 旧版保存属性收益 `gains` 时只保存 `{ attrId, val }`，导致曲线绑定丢失。
- v3.3 改为 `{ attrId, val, cvId }`，属性收益曲线可在预览表中生效。

兼容策略：

- 保留 `index.html` 原函数。
- ES Module 加载后覆盖同名 `window` 函数。
- 兼容旧 inline `onclick`，避免一次性大拆导致页面不可运行。

## v3.2 - Curve Library 模块化

目标：在 V3.1 状态统一和依赖修复基础上，完成曲线库模块化与动态参数面板接管。

核心新增：

| 文件 | 说明 |
|---|---|
| `src/curve/curve-library.js` | 曲线定义、参数 Schema、计算入口、采样入口 |
| `src/curve/curve-panel.js` | 接管曲线面板、动态参数、预览、引用保护 |

内置曲线：

| 类型 | ID |
|---|---|
| 线性 | `linear` |
| 边际递减 | `diminishing` |
| 对数 | `logarithmic` |
| 平方根 | `sqrt` |
| 幂函数 | `power` |
| 指数增长 | `expo` |
| 指数饱和 | `exponential` |
| S 型 | `sigmoid` |
| 恒定值 | `fix` |
| 阶梯跳跃 | `stair` |

兼容策略：

- 旧版 `S.curves` 保持兼容。
- 初始化时自动补齐缺失参数。
- 旧业务中 `cvVal(c, level)` 已由新模块统一接管。

## v3.1 - 稳定化重构

目标：不新增复杂玩法功能，优先完成去单文件化的第一步、状态统一、Worker 路径修复、CDN 离线化、依赖脚本补齐。

核心新增：

| 文件 | 说明 |
|---|---|
| `src/core/project-state.js` | 统一工程状态入口，兼容旧 `window.S` |
| `src/core/event-bus.js` | 模块间事件通信 |
| `libs/chart-lite.js` | 本地图表兼容层，替代 Chart.js CDN |

关键修复：

| 问题 | 修复 |
|---|---|
| Worker 路径错误 | `../workers/combat.worker.js` 改为 `./workers/combat.worker.js` |
| CDN 依赖 | 移除外部 Chart.js CDN，改本地 `libs/chart-lite.js` |
| 状态入口混乱 | `ProjectState` 接管 snapshot、restore、persist |
| JSON 兼容 | 导入兼容旧结构和 `gbt-project-state` |

残留风险：

- `index.html` 仍然很大。
- 旧内联函数与 V3 模块仍处于过渡共存状态。
- 后续仍需继续拆 Combat、Economy、Shop 等面板。

## 维护结论

V3.1 到 V3.7 的主线是：

```text
状态统一 -> 曲线库 -> 养成分支 -> 模拟器/ROI -> 策略引擎 -> 工程版本化
```

后续新增功能应优先接入：

- `ProjectState`
- `project-versioning`
- `curve-library`
- `roi-strategy`
- `simulator`

避免继续把业务逻辑堆回 `index.html`。
