# GameBalanceTool V3.10.8 技术维护手册

## 1. 项目定位

GameBalanceTool V3.10.8 是游戏数值模拟平台，核心目标是把属性、职业、境界、装备、养成、经济、曲线、战斗、付费模拟、地图、怪物相关、ROI、多方案工程统一到一个可导入导出的本地工具内。

当前仍是“旧 `index.html` 内联逻辑 + V3 ES Module”双轨结构，维护时必须兼顾旧 `onclick` 和 `window.xxx` 挂载。

## 2. 目录结构

```text
index.html                  主页面，仍包含旧内联逻辑
start-gbt.bat               Windows 一键启动入口
package.json                npm 脚本
playwright.config.js        Playwright 测试配置

src/
  core/                     ProjectState、事件总线、版本化
  data/                     属性、职业、境界、装备、货币默认数据
  engine/                   战斗、成长、装备、境界、ROI、模拟器计算
  ui/                       页面面板和 DOM 渲染
  curve/                    曲线库和曲线面板
  export/                   IndexedDB、JSON IO、迁移
  chart/                    图表适配

workers/
  combat.worker.js          战斗模拟 Worker

libs/
  chart-lite.js             本地图表兼容层

scripts/
  static-server.mjs         静态 HTTP 服务
  start-gbt.ps1             一键启动主逻辑

tests/
  smoke.spec.js             核心冒烟测试
  launcher.spec.js          启动器测试

docs/
  USER_MANUAL.md            用户使用手册
  TECHNICAL_MANUAL.md       技术维护手册
  VERSION_HISTORY.md        V3.1 到 V3.10 版本历史
```

## 3. 关键状态源

维护时优先复用：

| 模块 | 职责 |
|---|---|
| `src/core/project-state.js` | 统一 `window.S`、快照、恢复、持久化入口 |
| `src/core/project-versioning.js` | 多方案工程封包和版本迁移 |
| `src/core/event-bus.js` | 模块间事件通信 |
| `src/curve/curve-library.js` | 曲线定义和计算 |
| `src/engine/roi-strategy.js` | ROI 策略模拟 |
| `src/engine/simulator.js` | 生命周期模拟 |

注意：

- 旧版 `let S`、新版 `window.S`、`ProjectState` 必须保持桥接。
- 新增 UI 暴露给旧按钮时，需要挂到 `window.xxx`。
- 导入导出要兼容 `gbt-project`、`gbt-project-state`、v3 旧快照、v2.1 数据结构。

## 4. 启动与测试

启动：

```powershell
cd D:\GameBalanceTool_V3.6.1
.\start-gbt.bat
```

开发服务：

```powershell
npm run dev
```

自动化测试：

```powershell
npm test
```

语法检查：

```powershell
Get-ChildItem -Recurse -File -Include *.js,*.mjs src,workers,libs,scripts,tests | ForEach-Object { node --check $_.FullName }
```

PowerShell 启动脚本语法检查：

```powershell
$tokens = $null
$parseErrors = $null
$null = [System.Management.Automation.Language.Parser]::ParseFile('D:\GameBalanceTool_V3.6.1\scripts\start-gbt.ps1', [ref]$tokens, [ref]$parseErrors)
$parseErrors
```

## 5. 一键启动器行为

`start-gbt.bat` 只负责调用：

```text
scripts/start-gbt.ps1
```

`start-gbt.ps1` 负责：

| 行为 | 说明 |
|---|---|
| HTTP 探活 | `Invoke-WebRequest http://127.0.0.1:8080/` |
| 端口检查 | `Get-NetTCPConnection -LocalPort 8080` |
| 启动服务 | `node scripts/static-server.mjs --port 8080` |
| 等待启动 | 15 秒内轮询 HTTP 200 |
| 打开浏览器 | `Start-Process http://127.0.0.1:8080/` |

原则：端口被其他程序占用时只提示，不自动杀进程。

## 6. 维护边界

| 场景 | 做法 |
|---|---|
| 修 UI 按钮无响应 | 先查 `index.html` 旧 `onclick` 是否要求 `window.xxx` |
| 修数据不保存 | 先查 `ProjectState.snapshot/restore` 和 `save()` 调用链 |
| 修导入导出 | 先查 `src/export/migration.js` 和封包版本 |
| 修曲线异常 | 先查 `curve-library.js`，不要在 UI 内重复写公式 |
| 修 ROI 异常 | 优先查 `roi-strategy.js` 和 `simulator.js` 输入是否来自 ProjectState |
| 修 Worker 异常 | 确认 HTTP 服务路径和 MIME，不用 `file://` 测 |

## 7. 生成物与清理规则

以下不应进入版本管理：

```text
node_modules/
test-results/
playwright-report/
.codex-runtime/
%SystemDrive%/
.agents/
*.log
*.tmp
*.bak
```

`docs/` 保留用于手册和后续设计文档。

## 8. 本机环境备注

| 工具 | 路径/命令 |
|---|---|
| Python | `python`，当前版本 `Python 3.14.6` |
| Git | `C:\Program Files\Git\cmd\git.exe` |

当前 PowerShell 里普通 `git` 可能不在 PATH，运行 Git 使用：

```powershell
& 'C:\Program Files\Git\cmd\git.exe' status --short
```

## 9. 文档整理规则

- 根目录只保留 `README.md` 和项目协作入口 `AGENTS.md`。
- 用户使用说明放入 `docs/USER_MANUAL.md`。
- 技术维护说明放入 `docs/TECHNICAL_MANUAL.md`。
- 版本报告和历史变更统一放入 `docs/VERSION_HISTORY.md`。
- 不再新增 `V3.x_*_REPORT.md` 这类根目录散文件。
