# GameBalanceTool V3.10.10

游戏数值模拟平台，用于属性、职业、境界、装备、养成、经济、曲线、战斗、ROI 和多方案工程版本化管理。

当前版本：`v3.10.10 投入回报工具条修订版`

## 快速启动

Windows 直接双击：

```text
start-gbt.bat
```

或命令行启动：

```powershell
cd D:\GameBalanceTool_V3.6.1
npm run dev
```

访问：

```text
http://127.0.0.1:8080/
```

不要使用 `file://` 直接打开 `index.html`。V3 模块依赖 ES Module 和正确 MIME，必须通过 HTTP 服务访问。

## 手册

| 文档 | 用途 |
|---|---|
| [docs/USER_MANUAL.md](docs/USER_MANUAL.md) | 日常使用、启动、模块说明、导入导出、常见问题 |
| [docs/TECHNICAL_MANUAL.md](docs/TECHNICAL_MANUAL.md) | 项目结构、状态源、维护边界、测试命令 |
| [docs/VERSIONING_POLICY.md](docs/VERSIONING_POLICY.md) | 版本号规则、发版流程、同步清单 |
| [docs/VERSION_HISTORY.md](docs/VERSION_HISTORY.md) | V3.1 到 V3.10 的版本演进记录 |
| [docs/FUNCTION_TEST_REPORT.md](docs/FUNCTION_TEST_REPORT.md) | 全功能清单与模块自测报告 |

## 常用命令

```powershell
npm run dev
npm test
```

语法检查：

```powershell
Get-ChildItem -Recurse -File -Include *.js,*.mjs src,workers,libs,scripts,tests | ForEach-Object { node --check $_.FullName }
```

## 核心目录

| 路径 | 说明 |
|---|---|
| `index.html` | 主页面，旧内联逻辑和 V3 模块桥接共存 |
| `src/core/` | ProjectState、事件总线、工程版本化 |
| `src/data/` | 默认属性、职业、境界、装备、货币数据 |
| `src/engine/` | 战斗、成长、装备、境界、ROI、模拟器 |
| `src/ui/` | 页面面板 |
| `src/curve/` | 曲线库 |
| `src/export/` | IndexedDB、JSON 导入导出、迁移 |
| `workers/` | Web Worker |
| `tests/` | Playwright 测试 |
| `docs/` | 使用和技术文档 |

## 版本报告

版本报告已整合到 [docs/VERSION_HISTORY.md](docs/VERSION_HISTORY.md)，根目录不再保留零散 V3 报告文件。
