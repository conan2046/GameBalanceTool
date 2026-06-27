param(
  [int]$Port = 8080,
  [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$Url = "http://127.0.0.1:$Port/"
$ServerScript = 'scripts/static-server.mjs'

function Test-GbtHttp {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Wait-GbtHttp {
  param([int]$TimeoutSeconds = 15)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-GbtHttp) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }

  return $false
}

Write-Host "GameBalanceTool startup"
Write-Host "URL: $Url"

if (Test-GbtHttp) {
  Write-Host "Server is already running."
} else {
  $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

  if ($listener) {
    Write-Host "Port $Port is occupied by process $($listener.OwningProcess), but $Url did not return HTTP 200."
    Write-Host "Close that process or change the port, then run start-gbt.bat again."
    exit 1
  }

  Write-Host "Starting local server..."
  Start-Process `
    -FilePath 'node' `
    -ArgumentList @($ServerScript, '--port', "$Port") `
    -WorkingDirectory $Root `
    -WindowStyle Hidden

  if (-not (Wait-GbtHttp -TimeoutSeconds 15)) {
    Write-Host "Server startup timed out. Run npm run dev to view detailed logs."
    exit 1
  }

  Write-Host "Server started."
}

if (-not $NoOpen) {
  Write-Host "Opening browser..."
  Start-Process $Url
}

Write-Host "Ready: $Url"
