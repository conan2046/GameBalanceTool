# GameBalanceTool V3.8.1 功能清单与自测报告

测试日期：2026-06-26  
测试地址：`http://127.0.0.1:8080/`  
测试方式：Playwright 自动化 + 页面函数级自测 + 现有回归测试

## 1. 结论

| 项 | 结果 |
|---|---|
| 主页面启动 | 通过 |
| 10 个主导航 Tab 切换 | 通过 |
| 核心业务模块渲染 | 基本通过 |
| 计算类模块 | 通过 |
| 导入导出封包结构 | 通过 |
| 页面 JS 致命错误 | 未发现 |
| 发现问题 | 2 个 |

当前主要问题：

| 优先级 | 问题 | 影响 |
|---|---|---|
| 已修复 | 境界修炼区初始未渲染 `realm-grid` 和 `realm-metrics` | 已补初始化和回归测试 |
| 已修复 | 战斗演算战力档位颜色存在空字符串警告 | 已补合法默认色和回归测试 |

## 2. 项目功能点清单

### 2.1 启动与工程能力

| 功能点 | 说明 | 自测结果 |
|---|---|---|
| 一键启动 | `start-gbt.bat` 检查端口、启动服务、打开网页 | 通过 |
| 本地静态服务 | `scripts/static-server.mjs --port 8080` | 通过 |
| Playwright 回归测试 | `npm test` | 通过 |
| JS 语法检查 | `node --check` 扫描 `src/workers/libs/scripts/tests` | 通过 |
| ProjectState 状态封包 | `window.ProjectState.snapshot()` 输出 `gbt-project` | 通过 |
| 多方案工程结构 | `project.scenarios` 存在并可新增/删除 | 通过 |

### 2.2 页面主导航

| Tab | 面板 ID | 自测结果 |
|---|---|---|
| 属性与权重 | `panel-attr` | 通过 |
| 属性成长矩阵 | `panel-matrix` | 通过 |
| 职业设定 | `panel-class` | 通过 |
| 养成系统 | `panel-cult` | 部分通过 |
| 资源管理 | `panel-res` | 通过 |
| 经济产出 | `panel-eco` | 通过 |
| 礼包/商店 | `panel-pack` | 通过 |
| 战斗演算 | `panel-combat2` | 通过 |
| ROI 对比 | `panel-roi2` | 通过 |
| 曲线库 | `panel-curve` | 通过 |

### 2.3 属性与权重

| 功能点 | 自测动作 | 结果 |
|---|---|---|
| 属性表渲染 | 检查 `#t-attr tbody tr` | 通过，默认 3 行 |
| 添加属性弹窗 | 调用 `openAttrModal()` | 通过 |
| 属性保存入口 | `saveAttr()` 已挂载在页面按钮 | 通过 |

### 2.4 属性成长矩阵

| 功能点 | 自测动作 | 结果 |
|---|---|---|
| 矩阵表渲染 | 检查 `#matrix-tbody` | 通过 |
| 等级滑杆预览 | 调用 `onMatrixSliderChange(60)` | 通过 |
| 恢复默认矩阵 | 调用 `resetMatrix()` | 通过，5 行矩阵 |

### 2.5 职业设定

| 功能点 | 自测动作 | 结果 |
|---|---|---|
| 职业卡片 | 检查 `#class-selector .class-card` | 通过，默认 3 职业 |
| 伤害类型 | 检查 `#damage-types .damage-type-card` | 通过，默认 3 类型 |
| 1v1 克制矩阵 | 检查 `#kill-matrix tbody tr` | 通过 |
| 新增/删除职业 | `addClass()` 后删除新增职业 | 通过，3 -> 4 -> 3 |

### 2.6 养成系统、境界、装备

| 功能点 | 自测动作 | 结果 |
|---|---|---|
| 装备槽位 | 检查 `#slot-editor .slot-card` | 通过，9 槽位 |
| 装备品质 | 检查 `#quality-editor .quality-card` | 通过，6 品质 |
| 精炼面板 | 调用 `renderRefinePanel()` | 通过 |
| 养成树 | 调用 `renderCultPanel()` | 通过 |
| 分支曲线预览 | 调用 `previewBranchCurve(lineId, branchId)` | 通过 |
| 修为/炼体切换 | 调用 `switchRealmType('body')` / `switchRealmType('cultivation')` | 通过，但依赖先渲染 |
| 境界初始显示 | 直接进入 `panel-cult` 检查 `realm-grid` / `realm-metrics` | 通过 |

境界问题复核：

| 检查项 | 结果 |
|---|---|
| 初始 `#realm-grid .realm-card` | 0 |
| 初始 `#realm-metrics` 文本长度 | 0 |
| 手动调用 `renderRealms()` 后境界卡 | 8 |
| 手动调用 `renderRealms()` 后指标区 | 有内容 |

判断：境界数据和渲染函数都存在，问题是进入页面后没有自动调用旧版 `renderRealms()`。

### 2.7 资源管理

| 功能点 | 自测动作 | 结果 |
|---|---|---|
| 资源表渲染 | 检查 `#t-res tbody tr` | 通过，默认 2 行 |
| 添加资源弹窗 | 调用 `openResModal()` | 通过 |

### 2.8 经济产出

| 功能点 | 自测动作 | 结果 |
|---|---|---|
| 货币体系表 | 检查 `#currency-table tr` | 通过，默认 7 层 |
| VIP 表 | 检查 `#vip-table tr` | 通过，默认 15 级 |
| 汇率卡片 | 检查 `#exchange-rates .stat-card` | 通过 |
| 经济产出配置 | 检查 `#tbl-eco-config tbody tr` | 通过 |
| 新增/恢复货币 | `addCurrency()` / `resetCurrencies()` | 通过 |
| 新增/恢复 VIP | `addVip()` / `resetVip()` | 通过 |

### 2.9 礼包/商店

| 功能点 | 自测动作 | 结果 |
|---|---|---|
| 礼包表 | 检查 `#t-pack tbody tr` | 通过，默认 2 个礼包 |
| 商店分析表 | 检查 `#tbl-shop-analysis tbody tr` | 通过 |
| 星级配置表 | 检查 `#tbl-star-config tbody tr` | 通过，5 档 |
| 礼包编辑弹窗 | 调用 `openPackModal()` | 通过 |

### 2.10 战斗演算

| 功能点 | 自测动作 | 结果 |
|---|---|---|
| 公式类型切换 | 设置 `#cb-formula-type = hybrid` 后调用 `switchCombatFormula()` | 通过 |
| 沙盘对决 | 调用 `runCombatSim2()` | 通过 |
| 伤害输出 | 检查 `#cb-expected-dmg` | 通过，示例值 `161` |
| 回合数 | 检查 `#cb-rounds` | 通过，示例值 `25+(未结束)` |
| 战斗日志 | 检查 `#tbl-cb-log tbody tr` | 通过，12 行 |
| 战力档位新增/恢复 | `addCombatTier()` / `resetCombatTier()` | 通过，7 -> 8 -> 7 |

### 2.11 ROI 对比与 Project 多方案

| 功能点 | 自测动作 | 结果 |
|---|---|---|
| ROI 系统卡片 | 检查 `#roi-sys-grid .roi-sys-card` | 通过，4 卡片 |
| 智能分配 | 调用 `roiAutoInvest()` | 通过 |
| 下一天 | 调用 `roiAdvanceDay()` | 通过 |
| ROI 结果表 | 检查 `#roi-results-tbl tbody tr` | 通过 |
| Project 多方案面板 | 调用 `renderProjectScenarioPanel()` | 通过 |
| 新增/删除方案 | `projectAddScenario()` / `projectRemoveScenario()` | 通过，4 -> 5 -> 4 |

### 2.12 曲线库

| 功能点 | 自测动作 | 结果 |
|---|---|---|
| 曲线表 | 检查 `#t-curve tbody tr` | 通过，默认 7 条 |
| 曲线预览图 | 检查 `#cv-svg` | 通过 |
| 创建曲线弹窗 | 调用 `openCurveModal()` | 通过 |
| 曲线类型 | 检查 `#cv-type option` | 通过，10 类 |

### 2.13 隐藏生命周期模拟器

`panel-sim` 存在于 DOM，但当前主导航没有入口。作为技术模块进行函数级自测：

| 功能点 | 自测动作 | 结果 |
|---|---|---|
| 生命周期模拟 | 调用 `runSimulation()` | 通过，`#sim-result` 有输出 |

建议：如果后续仍需要给用户使用，应补回导航入口；如果不需要，应从 HTML 中清理或在技术手册中标记为内部模块。

### 2.14 导入导出与状态

| 功能点 | 自测动作 | 结果 |
|---|---|---|
| ProjectState 封包 | `window.ProjectState.snapshot({ from: 'functional-test' })` | 通过 |
| Schema | 检查 `schema === 'gbt-project'` | 通过 |
| Project Scenarios | 检查 `data.project.scenarios.length` | 通过，4 个 |
| 全局函数挂载 | 检查 `ProjectState/exportVersionedProject/importV3Data/openCurveModal/openBranchModal/runCombatSim2/roiResetAll` | 通过 |

说明：文件导入会触发系统文件选择框，未在自动化中直接选择本地文件；本轮验证的是导入导出入口、封包结构和全局挂载。

## 3. 自动化命令结果

### 3.1 Playwright 回归测试

```text
npm test
4 passed
```

覆盖：

- 工程版本化封包恢复
- 主页面启动
- 曲线库渲染
- 养成树渲染
- ROI 与 Project Scenario 面板
- 一键启动器脚本结构

### 3.2 JS 语法检查

```powershell
Get-ChildItem -Recurse -File -Include *.js,*.mjs src,workers,libs,scripts,tests | ForEach-Object { node --check $_.FullName }
```

结果：通过。

### 3.3 本地服务探活

```text
http://127.0.0.1:8080/ -> 200
```

结果：通过。

## 4. 修复记录

### 已修复：境界修炼区初始未渲染

现象：

- 打开“养成系统”后，`#realm-grid` 为空。
- `#realm-metrics` 为空。
- 手动调用 `renderRealms()` 后恢复正常。

推断根因：

- 旧版 `renderRealms()` 没有在初始加载或切换到 `panel-cult` 时被调用。
- 当前 `rAll()` 只调用了 `rAttrs/rRes/rCurves/rCult/rPacks/renderShopAnalysis`，没有调用 `renderRealms()`。

修复：

- 在旧境界代码定义完成后的 `DOMContentLoaded` 中调用 `_initRealmModals()` 和 `renderRealms()`。
- 在切换到 `panel-cult` 时补调用 `window.renderRealms()`。
- 增加回归测试：进入养成系统后 `#realm-grid .realm-card` 应可见，`#realm-metrics` 应有内容。

复测结果：

```text
realmCards: 8
realmMetricsLength: 27
```

### 已修复：战斗演算战力档位颜色 warning

现象：

浏览器控制台多次出现：

```text
The specified value "" does not conform to the required format. The format is "#rrggbb".
```

根因：

- `S.combatTiers[0].color` 默认值为空字符串，不符合 `<input type="color">` 的 `#rrggbb` 格式。

修复：

- 首档战力颜色改为 `#b2bec3`。
- `initCombatTiers()` 增加颜色兜底规范化，旧存档里如果仍有空值也会自动修正。
- 增加回归测试：所有 `S.combatTiers[*].color` 必须匹配 `^#[0-9a-fA-F]{6}$`。

复测结果：

```text
combatTierColors:
#b2bec3, #74b9ff, #55efc4, #ffeaa7, #fab1a0, #ff7675, #fd79a8
console issues: 0
```

## 5. 下一步建议

| 优先级 | 建议 |
|---|---|
| 1 | 决定 `panel-sim` 是否恢复导航入口，或作为内部模块保留 |
| 2 | 把本轮更多函数级自测脚本沉淀成正式 Playwright 测试，继续扩大回归覆盖 |
