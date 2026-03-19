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

foreach ($processId in $listeners) {
  if ($processId) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }
}

Start-Sleep -Milliseconds 500

$portStillOpen = Test-NetConnection -ComputerName "localhost" -Port 4488 -InformationLevel Quiet -WarningAction SilentlyContinue

if ($portStillOpen) {
  $remaining = Get-CaptureServerListeners
  $pidList = if ($remaining) {
    ($remaining | ForEach-Object { "$_" }) -join ", "
  } else {
    "unknown"
  }
  Write-Error "Capture server is still bound to port 4488 by PID(s): $pidList. Stop that process, then re-run scripts/start-capture-server.ps1."
  exit 1
}

$command = "start `"`" /b `"$nodeExe`" scripts\capture-server.mjs 1> `"$stdoutPath`" 2> `"$stderrPath`""
Push-Location $repoRoot
try {
  cmd /c $command | Out-Null
} finally {
  Pop-Location
}

Start-Sleep -Seconds 2

$portNowOpen = Test-NetConnection -ComputerName "localhost" -Port 4488 -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $portNowOpen) {
  Write-Error "Capture server launch command returned, but localhost:4488 is still unavailable. Check $stderrPath for startup errors."
  exit 1
}

$listenerPid = (Get-CaptureServerListeners | Select-Object -First 1)
Write-Output "Capture server started on port 4488"
Write-Output "listener pid: $listenerPid"
Write-Output "stdout: $stdoutPath"
Write-Output "stderr: $stderrPath"
