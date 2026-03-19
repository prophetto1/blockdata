$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$logDir = Join-Path $repoRoot "docs\design-layouts\logs"
$stdoutPath = Join-Path $logDir "capture-server.stdout.log"
$stderrPath = Join-Path $logDir "capture-server.stderr.log"

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

$command = "npm run capture-server 1> `"$stdoutPath`" 2> `"$stderrPath`""
$process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $command -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru

Write-Output "Capture server started with PID $($process.Id)"
Write-Output "stdout: $stdoutPath"
Write-Output "stderr: $stderrPath"
