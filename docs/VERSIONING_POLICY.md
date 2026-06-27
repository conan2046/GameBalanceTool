# GameBalanceTool 版本维护规则

## 当前版本

- 产品版本：`v3.10.1`
- 版本名：战斗配置布局修订版
- 单一代码来源：`src/core/project-versioning.js`

## 版本号规则

项目使用语义版本号：`MAJOR.MINOR.PATCH`。

| 层级 | 递增条件 | 示例 |
|---|---|---|
| `MAJOR` | 数据结构或核心架构不兼容，需要明确迁移方案 | `4.0.0` |
| `MINOR` | 新增功能页、核心引擎、模块级能力，兼容旧数据 | `3.10.0` |
| `PATCH` | Bug 修复、UI 调整、文案修正、测试补齐 | `3.10.1` |

## 每次发版必须同步

| 位置 | 要求 |
|---|---|
| `src/core/project-versioning.js` | 更新 `PROJECT_VERSION`、版本名和兼容版本列表 |
| 页面头部 | 通过 `APP_VERSION_LABEL` 展示当前版本 |
| 导入导出 | 默认文件名必须包含当前版本 |
| `docs/VERSION_HISTORY.md` | 新增版本记录、说明变更和验证范围 |
| 测试 | 更新版本断言，确保封包迁移目标正确 |
| Git | 本地验收通过后提交并推送，必要时打 `vX.Y.Z` 标签 |

## 建议发版流程

1. 判断变更类型：功能版本还是修订版本。
2. 更新 `PROJECT_VERSION`。
3. 更新 `docs/VERSION_HISTORY.md`。
4. 执行 `npm test` 和 JS 语法检查。
5. 浏览器打开本地页面，确认头部版本号、导出文件名、核心模块可用。
6. 提交并推送 GitHub。
7. 重要版本打标签：`git tag vX.Y.Z && git push origin vX.Y.Z`。
