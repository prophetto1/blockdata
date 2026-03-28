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

Write-Output "=== platform-api Config ==="
Write-Output "ENV_FILE:       $envPath"
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
