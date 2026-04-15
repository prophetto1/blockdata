param(
  [string]$MastraRepoRoot = "I:\mastra",
  [string]$RuntimeRoot = "I:\mastra-runtime\examples-agent",
  [int]$StudioPort = 4111,
  [string]$SourceEnvPath
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$statusScriptPath = Join-Path $scriptDir "mastra-local-status.ps1"
$dockerAssetRoot = $scriptDir
$stateDir = Join-Path $repoRoot ".codex-tmp\mastra-runtime"
$statePath = Join-Path $stateDir "state.json"

if (-not $SourceEnvPath) {
  $SourceEnvPath = Join-Path $repoRoot ".env"
}

$composeFile = Join-Path $MastraRepoRoot ".dev\docker-compose.yaml"
$runtimeComposeTemplatePath = Join-Path $dockerAssetRoot "mastra-runtime-container.compose.yaml"
$runtimeDockerfileTemplatePath = Join-Path $dockerAssetRoot "mastra-runtime-container.Dockerfile"
$runtimeDockerignoreTemplatePath = Join-Path $dockerAssetRoot "mastra-runtime-container.dockerignore"
$sourceExampleDir = Join-Path $MastraRepoRoot "examples\agent"
$runtimePackageJsonPath = Join-Path $RuntimeRoot "package.json"
$runtimeLockfilePath = Join-Path $RuntimeRoot "pnpm-lock.yaml"
$runtimeEnvPath = Join-Path $RuntimeRoot ".env"
$runtimeDockerfilePath = Join-Path $RuntimeRoot "Dockerfile"
$runtimeDockerignorePath = Join-Path $RuntimeRoot ".dockerignore"
$runtimeContainerName = "mastra-runtime"

function Get-OpenAiApiKey {
  param([string]$EnvPath)

  if ($env:OPENAI_API_KEY) {
    return $env:OPENAI_API_KEY
  }

  if (-not (Test-Path $EnvPath)) {
    return $null
  }

  foreach ($rawLine in Get-Content -Path $EnvPath) {
    $line = $rawLine.Trim()
    if (-not $line) { continue }
    if ($line.StartsWith("#")) { continue }
    if ($line -like "OPENAI_API_KEY=*") {
      $value = $line.Substring("OPENAI_API_KEY=".Length).Trim()
      if ($value) {
        return $value
      }
    }
  }

  return $null
}

function Wait-ForDockerReady {
  $deadline = (Get-Date).AddMinutes(3)
  while ((Get-Date) -lt $deadline) {
    try {
      docker info | Out-Null
      return $true
    } catch {
      Start-Sleep -Seconds 5
    }
  }

  return $false
}

function Wait-ForContainerRunning {
  param([string]$ContainerName)

  $deadline = (Get-Date).AddMinutes(4)
  while ((Get-Date) -lt $deadline) {
    try {
      $name = docker ps --filter "name=$ContainerName" --format "{{.Names}}" 2>$null | Select-Object -First 1
      if ($name -and $name.Trim() -eq $ContainerName) {
        return $true
      }
    } catch {
    }

    Start-Sleep -Seconds 5
  }

  return $false
}

function Wait-ForStudio {
  param([int]$Port)

  $url = "http://127.0.0.1:$Port"
  $deadline = (Get-Date).AddMinutes(4)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return [ordered]@{
          ok = $true
          url = $url
          status_code = [int]$response.StatusCode
        }
      }
    } catch {
    }

    Start-Sleep -Seconds 5
  }

  return [ordered]@{
    ok = $false
    url = $url
    status_code = $null
  }
}

function Invoke-StepCommand {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$WorkingDirectory,
    [string]$StepName
  )

  Push-Location $WorkingDirectory
  try {
    & $FilePath @ArgumentList
    if ($LASTEXITCODE -ne 0) {
      throw "$StepName failed with exit code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
}

function Write-Utf8NoBom {
  param(
    [string]$Path,
    [string]$Content
  )

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Sync-RuntimeSource {
  param(
    [string]$SourcePath,
    [string]$DestinationPath
  )

  New-Item -ItemType Directory -Force -Path $DestinationPath | Out-Null
  robocopy $SourcePath $DestinationPath /E /XD node_modules .mastra /XF pnpm-lock.yaml .env > $null
  if ($LASTEXITCODE -ge 8) {
    throw "robocopy failed with exit code $LASTEXITCODE."
  }
}

function Ensure-StudioPublicHostConfig {
  param(
    [string]$MastraIndexPath,
    [string]$BindHost = "0.0.0.0",
    [string]$StudioHost = "127.0.0.1",
    [string]$StudioProtocol = "http",
    [int]$StudioPort = 4111
  )

  if (-not (Test-Path $MastraIndexPath)) {
    throw "Mastra runtime index not found at $MastraIndexPath."
  }

  $content = Get-Content -Path $MastraIndexPath -Raw

  if ($content.Contains("studioHost: '$StudioHost'") -and $content.Contains("studioProtocol: '$StudioProtocol'")) {
    return $false
  }

  $pattern = "  server:\s*\{\s*auth:\s*mastraAuth,\s*rbac:\s*rbacProvider,\s*\},"
  $replacement = @"
  server: {
    host: '$BindHost',
    studioHost: '$StudioHost',
    studioProtocol: '$StudioProtocol',
    studioPort: $StudioPort,
    auth: mastraAuth,
    rbac: rbacProvider,
  },
"@

  $updated = [regex]::Replace(
    $content,
    $pattern,
    [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $replacement },
    1
  )

  if ($updated -eq $content) {
    throw "Failed to inject Studio public-host config into $MastraIndexPath."
  }

  Write-Utf8NoBom -Path $MastraIndexPath -Content $updated
  return $true
}

function Remove-PnpmOverrides {
  param([string]$PackageJsonPath)

  if (-not (Test-Path $PackageJsonPath)) {
    throw "Runtime package.json not found at $PackageJsonPath."
  }

  $packageJson = Get-Content -Path $PackageJsonPath -Raw | ConvertFrom-Json
  $hasPnpm = $packageJson.PSObject.Properties.Name -contains "pnpm"
  if (-not $hasPnpm) {
    return $false
  }

  $hadOverrides = $packageJson.pnpm.PSObject.Properties.Name -contains "overrides"
  if ($hadOverrides) {
    $packageJson.pnpm.PSObject.Properties.Remove("overrides")
  }

  if (-not $packageJson.pnpm.PSObject.Properties.Name.Count) {
    $packageJson.PSObject.Properties.Remove("pnpm")
  }

  Write-Utf8NoBom -Path $PackageJsonPath -Content ($packageJson | ConvertTo-Json -Depth 100)
  $writtenPackageJson = Get-Content -Path $PackageJsonPath -Raw | ConvertFrom-Json
  if (
    ($writtenPackageJson.PSObject.Properties.Name -contains "pnpm") -and
    ($writtenPackageJson.pnpm.PSObject.Properties.Name -contains "overrides")
  ) {
    throw "Failed to remove pnpm.overrides from $PackageJsonPath."
  }

  return $hadOverrides
}

function Ensure-OpenAiEnvValue {
  param(
    [string]$EnvPath,
    [string]$OpenAiApiKey
  )

  $lines = @()
  if (Test-Path $EnvPath) {
    $lines = @(Get-Content -Path $EnvPath)
  }

  $updated = $false
  for ($index = 0; $index -lt $lines.Count; $index++) {
    if ($lines[$index] -like "OPENAI_API_KEY=*") {
      $lines[$index] = "OPENAI_API_KEY=$OpenAiApiKey"
      $updated = $true
      break
    }
  }

  if (-not $updated) {
    $lines += "OPENAI_API_KEY=$OpenAiApiKey"
  }

  $content = ($lines -join "`r`n")
  if ($content.Length -gt 0 -and -not $content.EndsWith("`r`n")) {
    $content += "`r`n"
  }

  Write-Utf8NoBom -Path $EnvPath -Content $content
}

function Copy-TemplateFile {
  param(
    [string]$SourcePath,
    [string]$DestinationPath
  )

  if (-not (Test-Path $SourcePath)) {
    throw "Template file not found at $SourcePath."
  }

  $content = Get-Content -Path $SourcePath -Raw
  Write-Utf8NoBom -Path $DestinationPath -Content $content
}

function Read-State {
  if (-not (Test-Path $statePath)) {
    return $null
  }

  try {
    return Get-Content -Path $statePath -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Stop-ManagedLauncher {
  param($State)

  if (-not $State) {
    return $false
  }

  if (-not ($State.PSObject.Properties.Name -contains "launcher_pid")) {
    return $false
  }

  $launcherPid = [int]$State.launcher_pid
  if ($launcherPid -le 0) {
    return $false
  }

  try {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $launcherPid" -ErrorAction Stop
    $commandLine = [string]$process.CommandLine
    if (
      $commandLine -and
      $commandLine.IndexOf("mastra:dev", [System.StringComparison]::OrdinalIgnoreCase) -lt 0 -and
      $commandLine.IndexOf("pnpm", [System.StringComparison]::OrdinalIgnoreCase) -lt 0
    ) {
      return $false
    }

    taskkill /PID $launcherPid /T /F > $null
    Start-Sleep -Seconds 2
    return $true
  } catch {
    return $false
  }
}

function Remove-ExistingRuntimeContainer {
  param([string]$ContainerName)

  try {
    $containerRecord = @(
      docker ps -a --format "{{.ID}}|{{.Names}}" 2>$null |
        Where-Object { $_ -and $_.Trim() } |
        Where-Object { ($_.Split("|", 2))[1] -eq $ContainerName } |
        Select-Object -First 1
    )

    if (-not $containerRecord) {
      return $false
    }

    $containerId = ($containerRecord[0].Split("|", 2))[0]
    docker rm -f $containerId | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "docker rm -f failed for $ContainerName."
    }

    return $true
  } catch {
    throw
  }
}

function Get-ComposeFriendlyPath {
  param([string]$Path)

  return ([System.IO.Path]::GetFullPath($Path) -replace "\\", "/")
}

$steps = @()
$statusJson = & $statusScriptPath -MastraRepoRoot $MastraRepoRoot -RuntimeRoot $RuntimeRoot -StudioPort $StudioPort -SourceEnvPath $SourceEnvPath
$status = $statusJson | ConvertFrom-Json

if (-not $status.compose_file_present) {
  throw "Mastra compose file not found at $composeFile."
}

if (-not $status.source_example_dir_present) {
  throw "Mastra example source directory not found at $sourceExampleDir."
}

if (-not (Test-Path $runtimeComposeTemplatePath)) {
  throw "Runtime compose template not found at $runtimeComposeTemplatePath."
}

if (-not (Test-Path $runtimeDockerfileTemplatePath)) {
  throw "Runtime Dockerfile template not found at $runtimeDockerfileTemplatePath."
}

if (-not (Test-Path $runtimeDockerignoreTemplatePath)) {
  throw "Runtime dockerignore template not found at $runtimeDockerignoreTemplatePath."
}

if (-not $status.docker_ready) {
  $dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  if (-not (Test-Path $dockerDesktopPath)) {
    throw "Docker Desktop is not installed at $dockerDesktopPath."
  }

  Start-Process $dockerDesktopPath | Out-Null
  $dockerReady = Wait-ForDockerReady
  $steps += [ordered]@{
    step = "docker"
    ok = $dockerReady
    detail = if ($dockerReady) { "Docker Desktop is ready." } else { "Docker Desktop did not become ready in time." }
  }
  if (-not $dockerReady) {
    throw "Docker Desktop did not become ready in time."
  }
}

$pnpmCommand = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if (-not $pnpmCommand) {
  $pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
}
if (-not $pnpmCommand) {
  throw "Unable to find pnpm on PATH."
}

$state = Read-State
$stoppedLauncher = Stop-ManagedLauncher -State $state
if ($stoppedLauncher) {
  $steps += [ordered]@{
    step = "stop_launcher"
    ok = $true
    detail = "Stopped the previously managed host launcher before normalizing the runtime."
  }
}

Sync-RuntimeSource -SourcePath $sourceExampleDir -DestinationPath $RuntimeRoot
$steps += [ordered]@{
  step = "sync_runtime"
  ok = $true
  detail = "Synced examples\\agent into the standalone runtime directory."
}

$runtimeMastraIndexPath = Join-Path $RuntimeRoot "src\\mastra\\index.ts"
$patchedStudioHost = Ensure-StudioPublicHostConfig -MastraIndexPath $runtimeMastraIndexPath -StudioPort $StudioPort
$steps += [ordered]@{
  step = "normalize_runtime_server"
  ok = $true
  detail = if ($patchedStudioHost) {
    "Injected Studio public-host config into the standalone runtime source."
  } else {
    "Standalone runtime source already had the Studio public-host config."
  }
}

$hadOverrides = Remove-PnpmOverrides -PackageJsonPath $runtimePackageJsonPath
$steps += [ordered]@{
  step = "normalize_package_json"
  ok = $true
  detail = if ($hadOverrides) { "Removed pnpm.overrides from the runtime package.json." } else { "Runtime package.json already excluded pnpm.overrides." }
}

$statusJson = & $statusScriptPath -MastraRepoRoot $MastraRepoRoot -RuntimeRoot $RuntimeRoot -StudioPort $StudioPort -SourceEnvPath $SourceEnvPath
$status = $statusJson | ConvertFrom-Json

if ($status.runtime_package_overrides_present) {
  throw "Runtime package.json still contains pnpm.overrides after normalization."
}

$needsInstallReset = (
  -not $status.runtime_node_modules_present -or
  -not $status.runtime_lockfile_present -or
  $status.runtime_lockfile_contains_link -or
  -not $status.runtime_published_install_ready
)

if ($needsInstallReset) {
  $runtimeNodeModules = Join-Path $RuntimeRoot "node_modules"
  if (Test-Path $runtimeNodeModules) {
    Remove-Item -LiteralPath $runtimeNodeModules -Recurse -Force
  }
  if (Test-Path $runtimeLockfilePath) {
    Remove-Item -LiteralPath $runtimeLockfilePath -Force
  }
  $steps += [ordered]@{
    step = "reset_runtime_install"
    ok = $true
    detail = "Cleared runtime node_modules and pnpm-lock.yaml before reinstalling published packages."
  }
}

Invoke-StepCommand -FilePath $pnpmCommand.Source -ArgumentList @("install") -WorkingDirectory $RuntimeRoot -StepName "pnpm install"
$steps += [ordered]@{
  step = "runtime_install"
  ok = $true
  detail = "Ran pnpm install in the standalone runtime."
}

$statusJson = & $statusScriptPath -MastraRepoRoot $MastraRepoRoot -RuntimeRoot $RuntimeRoot -StudioPort $StudioPort -SourceEnvPath $SourceEnvPath
$status = $statusJson | ConvertFrom-Json
if (-not $status.runtime_published_install_ready) {
  throw "Standalone runtime install did not resolve published Mastra packages cleanly."
}

$openAiApiKey = Get-OpenAiApiKey -EnvPath $SourceEnvPath
if (-not $status.runtime_openai_key_present) {
  if (-not $openAiApiKey) {
    throw "OPENAI_API_KEY is not available in the current environment or source env file."
  }

  Ensure-OpenAiEnvValue -EnvPath $runtimeEnvPath -OpenAiApiKey $openAiApiKey
  $steps += [ordered]@{
    step = "runtime_env"
    ok = $true
    detail = "Ensured the standalone runtime .env contains OPENAI_API_KEY."
  }
}

Copy-TemplateFile -SourcePath $runtimeDockerfileTemplatePath -DestinationPath $runtimeDockerfilePath
Copy-TemplateFile -SourcePath $runtimeDockerignoreTemplatePath -DestinationPath $runtimeDockerignorePath
$steps += [ordered]@{
  step = "runtime_container_files"
  ok = $true
  detail = "Materialized Dockerfile and .dockerignore for the runtime container."
}

$env:MASTRA_RUNTIME_ROOT = Get-ComposeFriendlyPath -Path $RuntimeRoot
$env:MASTRA_STUDIO_PORT = "$StudioPort"

$removedContainer = Remove-ExistingRuntimeContainer -ContainerName $runtimeContainerName
if ($removedContainer) {
  $steps += [ordered]@{
    step = "runtime_container_reset"
    ok = $true
    detail = "Removed the previous runtime container so docker compose can recreate it cleanly."
  }
}

docker compose -f $composeFile -f $runtimeComposeTemplatePath up -d --build | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "docker compose up -d --build failed for the containerized runtime."
}
$steps += [ordered]@{
  step = "compose"
  ok = $true
  detail = "Started docker compose backing services plus the runtime container_name $runtimeContainerName."
}

$containerRunning = Wait-ForContainerRunning -ContainerName $runtimeContainerName
$steps += [ordered]@{
  step = "runtime_container"
  ok = $containerRunning
  detail = if ($containerRunning) { "The runtime container is running." } else { "The runtime container did not become running in time." }
}
if (-not $containerRunning) {
  throw "Mastra runtime container did not become running."
}

$studio = Wait-ForStudio -Port $StudioPort
$steps += [ordered]@{
  step = "mastra:dev"
  ok = $studio.ok
  detail = if ($studio.ok) { "Reached $($studio.url) from the containerized Mastra runtime." } else { "Mastra Studio did not become reachable in time." }
}
if (-not $studio.ok) {
  throw "Mastra Studio did not become reachable at $($studio.url)."
}

New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
$newState = [ordered]@{
  written_at = (Get-Date).ToUniversalTime().ToString("o")
  mastra_repo_root = $MastraRepoRoot
  runtime_root = $RuntimeRoot
  studio_port = $StudioPort
  launch_mode = "container"
  container_name = $runtimeContainerName
  compose_file = $composeFile
  runtime_compose_template = $runtimeComposeTemplatePath
  dockerfile_path = $runtimeDockerfilePath
  dockerignore_path = $runtimeDockerignorePath
}
Write-Utf8NoBom -Path $statePath -Content ($newState | ConvertTo-Json -Depth 6)

$finalStatusJson = & $statusScriptPath -MastraRepoRoot $MastraRepoRoot -RuntimeRoot $RuntimeRoot -StudioPort $StudioPort -SourceEnvPath $SourceEnvPath
$finalStatus = $finalStatusJson | ConvertFrom-Json

[ordered]@{
  ok = ($finalStatus.result -eq "ok")
  steps = $steps
  status = $finalStatus
} | ConvertTo-Json -Depth 8
