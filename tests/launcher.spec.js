import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

test('windows launcher delegates to the PowerShell startup script', () => {
  const launcherPath = path.join(root, 'start-gbt.bat');
  const launcher = fs.readFileSync(launcherPath, 'utf8');

  expect(launcher).toContain('ExecutionPolicy Bypass');
  expect(launcher).toContain('scripts\\start-gbt.ps1');
});

test('startup script checks the port, starts the server, and opens the app', () => {
  const scriptPath = path.join(root, 'scripts', 'start-gbt.ps1');
  const script = fs.readFileSync(scriptPath, 'utf8');

  expect(script).toContain('Get-NetTCPConnection');
  expect(script).toContain('Invoke-WebRequest');
  expect(script).toContain('scripts/static-server.mjs');
  expect(script).toContain('Start-Process');
  expect(script).toContain('http://127.0.0.1:$Port/');
});
