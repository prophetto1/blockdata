$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$userProfile = [Environment]::GetFolderPath("UserProfile")
$logDir = Join-Path $userProfile "Downloads\CaptureSessions\logs"
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

function Test-CaptureWorkerReady {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:4488/capture-worker/status" -UseBasicParsing -TimeoutSec 2
    return ($response.StatusCode -eq 200)
  } catch {
    return $false
  }
}

function Test-LegacyCaptureServer {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:4488/capture-sessions/defaults" -UseBasicParsing -TimeoutSec 2
    return ($response.StatusCode -eq 200)
  } catch {
    return $false
  }
}

function Get-ProcessCommandLine {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId
  )

  try {
    return (Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop).CommandLine
  } catch {
    return $null
  }
}

function Wait-ForPortRelease {
  param(
    [int]$TimeoutMs = 5000
  )

  $deadline = (Get-Date).AddMilliseconds($TimeoutMs)
  while ((Get-Date) -lt $deadline) {
    if (-not (Get-CaptureServerListeners)) {
      return $true
    }
    Start-Sleep -Milliseconds 200
  }

  return $false
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$listeners = Get-CaptureServerListeners

if ($listeners) {
  if (Test-CaptureWorkerReady) {
    $listenerPid = ($listeners | Select-Object -First 1)
    Write-Output "Capture worker already running on port 4488"
    Write-Output "listener pid: $listenerPid"
    Write-Output "stdout: $stdoutPath"
    Write-Output "stderr: $stderrPath"
    exit 0
  }

  $legacyCaptureServer = Test-LegacyCaptureServer
  $staleCaptureServerPids = @()

  foreach ($listenerProcessId in $listeners) {
    $commandLine = Get-ProcessCommandLine -ProcessId $listenerProcessId
    if ($commandLine -and $commandLine -match "scripts\\capture-server\.mjs") {
      $staleCaptureServerPids += $listenerProcessId
    }
  }

  if (-not $staleCaptureServerPids -and $legacyCaptureServer) {
    $staleCaptureServerPids = $listeners
  }

  if ($staleCaptureServerPids) {
    foreach ($staleProcessId in ($staleCaptureServerPids | Sort-Object -Unique)) {
      Stop-Process -Id $staleProcessId -Force -ErrorAction Stop
    }

    if (-not (Wait-ForPortRelease)) {
      $remainingListeners = Get-CaptureServerListeners
      $pidList = if ($remainingListeners) {
        ($remainingListeners | ForEach-Object { "$_" }) -join ", "
      } else {
        ($staleCaptureServerPids | ForEach-Object { "$_" }) -join ", "
      }
      Write-Error "Stopped stale capture server PID(s): $pidList, but port 4488 did not release in time. Check Task Manager and retry."
      exit 1
    }
  } else {
  $pidList = if ($listeners) {
    ($listeners | ForEach-Object { "$_" }) -join ", "
  } else {
    "unknown"
  }
  Write-Error "Port 4488 is already in use by PID(s): $pidList. Stop the existing capture server, then re-run scripts/start-capture-server.ps1."
  exit 1
  }
}

$command = "start `"`" /b `"$nodeExe`" scripts\capture-server.mjs 1> `"$stdoutPath`" 2> `"$stderrPath`""
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
    $response = Invoke-WebRequest -Uri "http://localhost:4488/capture-worker/status" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      $ready = $true
      break
    }
  } catch {
    # Keep polling until timeout.
  }
}

if (-not $ready) {
  Write-Error "Capture server launch command returned, but http://localhost:4488/capture-worker/status did not become ready. Check $stderrPath for startup errors."
  exit 1
}

$listenerPid = (Get-CaptureServerListeners | Select-Object -First 1)
if ($staleCaptureServerPids) {
  $replacedPidList = ($staleCaptureServerPids | ForEach-Object { "$_" }) -join ", "
  Write-Output "Replaced stale capture server PID(s): $replacedPidList"
}
Write-Output "Capture server started on port 4488"
Write-Output "listener pid: $listenerPid"
Write-Output "stdout: $stdoutPath"
Write-Output "stderr: $stderrPath"
