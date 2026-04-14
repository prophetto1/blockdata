param(
  [string]$RepoRoot = $env:REPO_ROOT,
  [string]$OpenMemoryRepoRoot = $env:OPENMEMORY_REPO_ROOT,
  [string]$OpenMemoryUser = $env:OPENMEMORY_USER,
  [int]$Port = 8766,
  [string]$PublicApiUrl = "http://localhost:8766",
  [string]$ComposeProjectName = "openmemory-local",
  [int]$StartupTimeoutSeconds = 120
)

$ErrorActionPreference = "Stop"

function Test-TcpPort {
  param(
    [string]$Address = "127.0.0.1",
    [int]$Port
  )

  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $async = $client.BeginConnect($Address, $Port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(500)) {
      return $false
    }

    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Convert-ToDockerPath {
  param([string]$PathValue)

  return ([System.IO.Path]::GetFullPath($PathValue) -replace "\\", "/")
}

function Get-UserFromApiEnv {
  param([string]$ApiEnvPath)

  if (-not (Test-Path $ApiEnvPath)) {
    return $null
  }

  $userLine = Get-Content $ApiEnvPath | Where-Object { $_ -match '^\s*USER=' } | Select-Object -First 1
  if (-not $userLine) {
    return $null
  }

  return ($userLine -replace '^\s*USER=', '').Trim()
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = Split-Path -Parent $PSScriptRoot
}

if ([string]::IsNullOrWhiteSpace($OpenMemoryRepoRoot)) {
  throw "OpenMemory source repo root is required. Pass -OpenMemoryRepoRoot or set OPENMEMORY_REPO_ROOT."
}

$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
$OpenMemoryRepoRoot = [System.IO.Path]::GetFullPath($OpenMemoryRepoRoot)

$apiRoot = Join-Path $OpenMemoryRepoRoot "api"
$uiRoot = Join-Path $OpenMemoryRepoRoot "ui"
$apiEnvPath = Join-Path $apiRoot ".env"
$composeFile = Join-Path $RepoRoot "scripts/openmemory-local.compose.yaml"
$memoryRoot = Join-Path $RepoRoot "_memory"
$openMemoryDataRoot = Join-Path $memoryRoot "openmemory"
$qdrantRoot = Join-Path $openMemoryDataRoot "qdrant"
$apiDataRoot = Join-Path $openMemoryDataRoot "api"

if (-not (Test-Path $apiRoot)) {
  throw "OpenMemory api directory not found at $apiRoot"
}

if (-not (Test-Path $uiRoot)) {
  throw "OpenMemory ui directory not found at $uiRoot"
}

if (-not (Test-Path $apiEnvPath)) {
  throw "OpenMemory api env file not found at $apiEnvPath"
}

if ([string]::IsNullOrWhiteSpace($OpenMemoryUser)) {
  $OpenMemoryUser = Get-UserFromApiEnv -ApiEnvPath $apiEnvPath
}

if ([string]::IsNullOrWhiteSpace($OpenMemoryUser)) {
  $OpenMemoryUser = $env:USERNAME
}

New-Item -ItemType Directory -Force -Path $memoryRoot | Out-Null
New-Item -ItemType Directory -Force -Path $openMemoryDataRoot | Out-Null
New-Item -ItemType Directory -Force -Path $qdrantRoot | Out-Null
New-Item -ItemType Directory -Force -Path $apiDataRoot | Out-Null

$env:WRITING_SYSTEM_ROOT_DOCKER = Convert-ToDockerPath -PathValue $RepoRoot
$env:OPENMEMORY_REPO_ROOT_DOCKER = Convert-ToDockerPath -PathValue $OpenMemoryRepoRoot
$env:OPENMEMORY_USER = $OpenMemoryUser
$env:OPENMEMORY_PUBLIC_API_URL = $PublicApiUrl

if (Test-TcpPort -Port $Port) {
  [PSCustomObject]@{
    Result = "already-listening"
    Port = $Port
    RepoRoot = $RepoRoot
    OpenMemoryRepoRoot = $OpenMemoryRepoRoot
    OpenMemoryUser = $OpenMemoryUser
    ApiDataRoot = $apiDataRoot
    QdrantRoot = $qdrantRoot
  }
  exit 0
}

docker compose -p $ComposeProjectName -f $composeFile up -d --build
if ($LASTEXITCODE -ne 0) {
  throw "docker compose up failed for OpenMemory"
}

$deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
do {
  Start-Sleep -Milliseconds 500
  if (Test-TcpPort -Port $Port) {
    [PSCustomObject]@{
      Result = "ok"
      Port = $Port
      RepoRoot = $RepoRoot
      OpenMemoryRepoRoot = $OpenMemoryRepoRoot
      OpenMemoryUser = $OpenMemoryUser
      ApiDataRoot = $apiDataRoot
      QdrantRoot = $qdrantRoot
      PublicApiUrl = $PublicApiUrl
    }
    exit 0
  }
} while ((Get-Date) -lt $deadline)

throw "OpenMemory failed to bind 127.0.0.1:$Port within $StartupTimeoutSeconds seconds"
