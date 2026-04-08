$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$logDir = Join-Path $repoRoot "docs\design-layouts\logs"
$stdoutPath = Join-Path $logDir "capture-server.stdout.log"
$stderrPath = Join-Path $logDir "capture-server.stderr.log"
$nodeExe = (Get-Command node.exe -ErrorAction Stop).Source

function Get-CaptureServerListeners {
  $raw = cmd /c "netstat -ano | findstr :4488"
  $lines = @()
  if ($raw) {
    $lines = ($raw | Out-String) -split "\r?\n"
  }
  $pids = @()

  foreach ($line in $lines) {
    if ($line -match "LISTENING\s+(\d+)$") {
      $pids += [int]$matches[1]
    }
  }

  return $pids | Sort-Object -Unique
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$listeners = Get-CaptureServerListeners

if ($listeners) {
  $pidList = if ($listeners) {
    ($listeners | ForEach-Object { "$_" }) -join ", "
  } else {
    "unknown"
  }
  Write-Error "Port 4488 is already in use by PID(s): $pidList. Stop the existing capture server, then re-run scripts/start-capture-server.ps1."
  exit 1
}

$command = "start `"`" /b `"$nodeExe`" scripts\capture\capture-server.mjs 1> `"$stdoutPath`" 2> `"$stderrPath`""
Push-Location $repoRoot
try {
  cmd /c $command | Out-Null
} finally {
  Pop-Location
}

Start-Sleep -Seconds 2

$ready = $false
for ($i = 0; $i -lt 10; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:4488/captures" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      $ready = $true
      break
    }
  } catch {
    # Keep polling until timeout.
  }
}

if (-not $ready) {
  Write-Error "Capture server launch command returned, but http://localhost:4488/captures did not become ready. Check $stderrPath for startup errors."
  exit 1
}

$listenerPid = (Get-CaptureServerListeners | Select-Object -First 1)
Write-Output "Capture server started on port 4488"
Write-Output "listener pid: $listenerPid"
Write-Output "stdout: $stdoutPath"
Write-Output "stderr: $stderrPath"
