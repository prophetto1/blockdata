param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("status", "recover")]
  [string]$Action,

  [int]$Port = 8000,
  [int]$HealthTimeoutSeconds = 45,
  [int]$PollIntervalMs = 1000
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$startScriptPath = Join-Path $scriptDir "start-platform-api.ps1"
$managedStatePath = Join-Path $repoRoot ".codex-tmp\platform-api-dev\state.json"

function Convert-ToIsoTimestamp {
  param(
    [Parameter(Mandatory = $false)]
    [datetime]$Value
  )

  if (-not $Value) {
    return $null
  }

  return $Value.ToUniversalTime().ToString("o")
}

function Read-ManagedState {
  if (-not (Test-Path $managedStatePath)) {
    return $null
  }

  try {
    return Get-Content -Path $managedStatePath -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Get-ProcessCommandLine {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId
  )

  try {
    $processRecord = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop
    return [ordered]@{
      command_line = $processRecord.CommandLine
      parent_pid = [int]$processRecord.ParentProcessId
      name = $processRecord.Name
    }
  } catch {
    return [ordered]@{
      command_line = $null
      parent_pid = $null
      name = $null
    }
  }
}

function Get-ProcessRecord {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId
  )

  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if (-not $process) {
    return $null
  }

  $commandInfo = Get-ProcessCommandLine -ProcessId $ProcessId

  return [ordered]@{
    pid = [int]$ProcessId
    name = if ($commandInfo.name) { $commandInfo.name } else { $process.ProcessName }
    started_at = Convert-ToIsoTimestamp -Value $process.StartTime
    command_line = $commandInfo.command_line
    parent_pid = $commandInfo.parent_pid
  }
}

function Get-ListenerRecord {
  try {
    $connection = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop | Select-Object -First 1
  } catch {
    $connection = $null
  }

  if (-not $connection) {
    return [ordered]@{
      running = $false
      pid = $null
      started_at = $null
      command_line = $null
      parent_pid = $null
      source = "none"
    }
  }

  $processRecord = Get-ProcessRecord -ProcessId $connection.OwningProcess
  if (-not $processRecord) {
    return [ordered]@{
      running = $true
      pid = [int]$connection.OwningProcess
      started_at = $null
      command_line = $null
      parent_pid = $null
      source = "tcp_listener"
    }
  }

  return [ordered]@{
    running = $true
    pid = $processRecord.pid
    started_at = $processRecord.started_at
    command_line = $processRecord.command_line
    parent_pid = $processRecord.parent_pid
    source = "tcp_listener"
  }
}

function Test-StateMatchesListener {
  param(
    [Parameter(Mandatory = $false)]
    $State,

    [Parameter(Mandatory = $true)]
    [hashtable]$Listener
  )

  if (-not $State) {
    return $false
  }

  if (-not $Listener.running) {
    return $false
  }

  $repoRootMatch = $State.repo_root -eq $repoRoot
  $portMatch = [int]$State.port -eq $Port
  $commandMatch = $false
  if ($Listener.command_line) {
    $commandMatch = $Listener.command_line -like "*app.main:app*"
  }

  $timeMatch = $false
  if ($State.written_at -and $Listener.started_at) {
    try {
      $stateTime = [datetimeoffset]::Parse($State.written_at)
      $listenerTime = [datetimeoffset]::Parse($Listener.started_at)
      $delta = [math]::Abs(($listenerTime - $stateTime).TotalSeconds)
      $timeMatch = $delta -le 300
    } catch {
      $timeMatch = $false
    }
  }

  return $repoRootMatch -and $portMatch -and $commandMatch -and $timeMatch
}

function Get-LaunchHygiene {
  param(
    [Parameter(Mandatory = $false)]
    $State,

    [Parameter(Mandatory = $true)]
    [hashtable]$Listener
  )

  $stateFilePresent = Test-Path $managedStatePath
  $repoRootMatch = $false
  $envLoaded = $false
  $approvedBootstrap = "unknown"
  $provenanceBasis = "unknown"
  $stateWrittenAt = $null

  if ($State) {
    $repoRootMatch = $State.repo_root -eq $repoRoot
    $envLoaded = [bool]$State.env_loaded
    $stateWrittenAt = $State.written_at

    if (Test-StateMatchesListener -State $State -Listener $Listener) {
      $approvedBootstrap = "true"
      $provenanceBasis = "state_plus_listener_match"
    } elseif ($stateFilePresent) {
      $approvedBootstrap = "unknown"
      $provenanceBasis = "state_only"
    }
  }

  return [ordered]@{
    approved_bootstrap = $approvedBootstrap
    provenance_basis = $provenanceBasis
    env_loaded = $envLoaded
    repo_root_match = $repoRootMatch
    state_file_present = $stateFilePresent
    state_path = $managedStatePath
    state_written_at = $stateWrittenAt
  }
}

function Invoke-Probe {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $url = "http://127.0.0.1:$Port$Path"

  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
    return [ordered]@{
      ok = ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300)
      status_code = [int]$response.StatusCode
      detail = "$Path returned $($response.StatusCode)."
      url = $url
    }
  } catch {
    $statusCode = $null
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode.value__
    }

    return [ordered]@{
      ok = $false
      status_code = $statusCode
      detail = $_.Exception.Message
      url = $url
    }
  }
}

function Wait-ForProbe {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $deadline = (Get-Date).AddSeconds($HealthTimeoutSeconds)
  $lastResult = $null

  while ((Get-Date) -lt $deadline) {
    $lastResult = Invoke-Probe -Path $Path
    if ($lastResult.ok) {
      return $lastResult
    }

    Start-Sleep -Milliseconds $PollIntervalMs
  }

  if ($lastResult) {
    return $lastResult
  }

  return [ordered]@{
    ok = $false
    status_code = $null
    detail = "Timed out waiting for $Path."
    url = "http://127.0.0.1:$Port$Path"
  }
}

function Get-StatusPayload {
  $state = Read-ManagedState
  $listener = Get-ListenerRecord
  $health = Invoke-Probe -Path "/health"
  $ready = Invoke-Probe -Path "/health/ready"
  $launchHygiene = Get-LaunchHygiene -State $state -Listener $listener

  $result = "unknown"
  if (-not $listener.running) {
    $result = "fail"
  } elseif ($health.ok -and $ready.ok) {
    $result = "ok"
  } else {
    $result = "warn"
  }

  return [ordered]@{
    available_action = "recover_platform_api"
    port = $Port
    listener = $listener
    launch_hygiene = $launchHygiene
    last_probe = [ordered]@{
      health_ok = $health.ok
      ready_ok = $ready.ok
      detail = "Health: $($health.detail) Ready: $($ready.detail)"
    }
    result = $result
  }
}

function Get-StopTargetIds {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Listener,

    [Parameter(Mandatory = $false)]
    $State
  )

  $targets = New-Object System.Collections.Generic.HashSet[int]

  if ($Listener.running -and $Listener.pid) {
    $null = $targets.Add([int]$Listener.pid)
  }

  if ($State -and $State.launcher_pid) {
    $null = $targets.Add([int]$State.launcher_pid)
  }

  try {
    $scriptProcesses = Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object {
      $_.CommandLine -and $_.CommandLine -like "*start-platform-api.ps1*"
    }

    foreach ($processRecord in $scriptProcesses) {
      $null = $targets.Add([int]$processRecord.ProcessId)
    }
  } catch {
    # Ignore CIM failures and stop the listener PID only.
  }

  return @($targets.ToArray() | Sort-Object -Descending)
}

function Stop-Targets {
  param(
    [Parameter(Mandatory = $true)]
    [int[]]$TargetIds
  )

  $steps = @()
  foreach ($targetId in $TargetIds) {
    $step = [ordered]@{
      step = "stop:$targetId"
      ok = $true
      pid = $targetId
      detail = "No process found."
    }

    $processRecord = Get-Process -Id $targetId -ErrorAction SilentlyContinue
    if ($processRecord) {
      try {
        Stop-Process -Id $targetId -Force -ErrorAction Stop
        $step.detail = "Stopped process $targetId."
      } catch {
        $step.ok = $false
        $step.detail = $_.Exception.Message
      }
    }

    $steps += $step
  }

  return $steps
}

function Start-ApprovedBootstrap {
  $powershellExe = (Get-Command powershell.exe -ErrorAction Stop).Source
  $startArgs = @(
    "-ExecutionPolicy", "Bypass",
    "-File", $startScriptPath,
    "-Port", "$Port"
  )

  $startedProcess = Start-Process -FilePath $powershellExe -ArgumentList $startArgs -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru
  return [ordered]@{
    pid = [int]$startedProcess.Id
    detail = "Started approved bootstrap via start-platform-api.ps1."
  }
}

function Write-JsonResult {
  param(
    [Parameter(Mandatory = $true)]
    $Value
  )

  $Value | ConvertTo-Json -Depth 10
}

switch ($Action) {
  "status" {
    Write-JsonResult -Value (Get-StatusPayload)
    exit 0
  }

  "recover" {
    $stateBefore = Read-ManagedState
    $listenerBefore = Get-ListenerRecord
    $steps = @()

    $targetIds = Get-StopTargetIds -Listener $listenerBefore -State $stateBefore
    $steps += Stop-Targets -TargetIds $targetIds

    $startResult = Start-ApprovedBootstrap
    $steps += [ordered]@{
      step = "start"
      ok = $true
      pid = $startResult.pid
      detail = $startResult.detail
    }

    $healthResult = Wait-ForProbe -Path "/health"
    $steps += [ordered]@{
      step = "probe:/health"
      ok = $healthResult.ok
      status_code = $healthResult.status_code
      detail = $healthResult.detail
    }

    $readyResult = Wait-ForProbe -Path "/health/ready"
    $steps += [ordered]@{
      step = "probe:/health/ready"
      ok = $readyResult.ok
      status_code = $readyResult.status_code
      detail = $readyResult.detail
    }

    $statusPayload = Get-StatusPayload
    $listenerAfter = $statusPayload.listener
    $ok = $listenerAfter.running -and $healthResult.ok -and $readyResult.ok

    $failureReason = $null
    if (-not $ok) {
      if (-not $listenerAfter.running) {
        $failureReason = "No listener detected on the expected dev port after recovery."
      } elseif (-not $healthResult.ok) {
        $failureReason = $healthResult.detail
      } else {
        $failureReason = $readyResult.detail
      }
    }

    Write-JsonResult -Value ([ordered]@{
      ok = $ok
      result = if ($ok) { "ok" } else { "fail" }
      action = "recover_platform_api"
      listener_before = $listenerBefore
      listener_after = $listenerAfter
      steps = $steps
      health_status_code = $healthResult.status_code
      ready_status_code = $readyResult.status_code
      failure_reason = $failureReason
      state = $statusPayload
    })

    if ($ok) {
      exit 0
    }

    exit 1
  }
}
