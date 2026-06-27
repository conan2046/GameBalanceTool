# GameBalanceTool Testing Notes

- Before opening `http://127.0.0.1:8080/`, confirm the local static server is running.
- On Windows, prefer double-clicking `start-gbt.bat`; it checks port `8080`, starts the local server when needed, and opens the browser automatically.
- Start the project with `npm run dev` or `node scripts/static-server.mjs --port 8080`.
- If the browser shows `127.0.0.1 refused to connect`, first check `Get-NetTCPConnection -LocalPort 8080`; this usually means no server is listening, not a frontend code error.
- `npm test` starts the Playwright web server automatically, but manual browser testing still requires `npm run dev`.
- Local Python is available through `python`; `Get-Command python` resolves to `C:\Users\Admin\AppData\Local\Microsoft\WindowsApps\python.exe`, and `python --version` currently reports `Python 3.14.6`.
- Git is installed at `C:\Program Files\Git\cmd\git.exe`; plain `git` may not resolve in the current PowerShell PATH. Use the full path when running Git commands.
