param(
  [int]$Port = 8000,
  [string]$ListenHost = "0.0.0.0",
  [switch]$NoReload
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$serviceDir = Join-Path $repoRoot "services\platform-api"
$envPath = Join-Path $repoRoot ".env"
$managedStateDir = Join-Path $repoRoot ".codex-tmp\platform-api-dev"
$managedStatePath = Join-Path $managedStateDir "state.json"

function Set-DotEnvVariables {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path $Path)) {
    Write-Warning "No .env file found at $Path. Starting with current process environment only."
    return
  }

  foreach ($rawLine in Get-Content -Path $Path) {
    $line = $rawLine.Trim()
    if (-not $line) { continue }
    if ($line.StartsWith("#")) { continue }

    $separatorIndex = $line.IndexOf("=")
    if ($separatorIndex -lt 1) { continue }

    $name = $line.Substring(0, $separatorIndex).Trim()
    $value = $line.Substring($separatorIndex + 1).Trim()

    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

function Resolve-PythonCommand {
  $python = Get-Command python.exe -ErrorAction SilentlyContinue
  if ($python) {
    return @($python.Source, "-m", "uvicorn")
  }

  $py = Get-Command py.exe -ErrorAction SilentlyContinue
  if ($py) {
    return @($py.Source, "-m", "uvicorn")
  }

  throw "Unable to find python.exe or py.exe on PATH."
}

function Write-ManagedState {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$PythonCommand,

    [Parameter(Mandatory = $true)]
    [string[]]$UvicornArgs
  )

  $launcherStartedAt = $null
  try {
    $currentProcess = Get-Process -Id $PID -ErrorAction Stop
    $launcherStartedAt = $currentProcess.StartTime.ToUniversalTime().ToString("o")
  } catch {
    $launcherStartedAt = $null
  }

  New-Item -ItemType Directory -Force -Path $managedStateDir | Out-Null

  $state = [ordered]@{
    written_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $repoRoot
    service_dir = $serviceDir
    env_path = $envPath
    env_loaded = Test-Path $envPath
    state_path = $managedStatePath
    bootstrap_script = $PSCommandPath
    port = $Port
    listen_host = $ListenHost
    reload = -not $NoReload
    launcher_pid = $PID
    launcher_started_at = $launcherStartedAt
    python_command = $PythonCommand
    uvicorn_args = $UvicornArgs
  }

  $state | ConvertTo-Json -Depth 6 | Set-Content -Path $managedStatePath -Encoding UTF8
}

Set-DotEnvVariables -Path $envPath

$pythonCommand = Resolve-PythonCommand
$uvicornArgs = @(
  "app.main:app",
  "--host", $ListenHost,
  "--port", "$Port"
)

if (-not $NoReload) {
  $uvicornArgs += "--reload"
}

Write-ManagedState -PythonCommand $pythonCommand -UvicornArgs $uvicornArgs

Write-Output "=== platform-api Config ==="
Write-Output "ENV_FILE:       $envPath"
Write-Output "STATE_FILE:     $managedStatePath"
Write-Output "SUPABASE_URL:   $($env:SUPABASE_URL)"
Write-Output "LOG_LEVEL:      $(if ($env:LOG_LEVEL) { $env:LOG_LEVEL } else { 'INFO' })"
Write-Output "OTEL_ENABLED:   $(if ($env:OTEL_ENABLED) { $env:OTEL_ENABLED } else { 'false' })"
Write-Output "OTEL_OTLP:      $(if ($env:OTEL_EXPORTER_OTLP_ENDPOINT) { $env:OTEL_EXPORTER_OTLP_ENDPOINT } else { 'http://localhost:4318' })"
Write-Output "SIGNOZ_UI_URL:  $(if ($env:SIGNOZ_UI_URL) { $env:SIGNOZ_UI_URL } else { 'http://localhost:8080' })"
Write-Output "==========================="

Push-Location $serviceDir
try {
  & $pythonCommand[0] $pythonCommand[1] $pythonCommand[2] @uvicornArgs
} finally {
  Pop-Location
}
