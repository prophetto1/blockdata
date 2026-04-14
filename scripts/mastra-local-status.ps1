param(
  [string]$MastraRepoRoot = "I:\mastra",
  [string]$RuntimeRoot = "I:\mastra-runtime\examples-agent",
  [int]$StudioPort = 4111,
  [string]$SourceEnvPath
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

if (-not $SourceEnvPath) {
  $SourceEnvPath = Join-Path $repoRoot ".env"
}

$composeFile = Join-Path $MastraRepoRoot ".dev\docker-compose.yaml"
$sourceExampleDir = Join-Path $MastraRepoRoot "examples\agent"
$runtimePackageJsonPath = Join-Path $RuntimeRoot "package.json"
$runtimeLockfilePath = Join-Path $RuntimeRoot "pnpm-lock.yaml"
$runtimeEnvPath = Join-Path $RuntimeRoot ".env"
$runtimeDockerfilePath = Join-Path $RuntimeRoot "Dockerfile"
$runtimeDockerignorePath = Join-Path $RuntimeRoot ".dockerignore"
$runtimeComposeTemplatePath = Join-Path $scriptDir "mastra-runtime-container.compose.yaml"
$runtimeContainerName = "mastra-runtime"
$stateDir = Join-Path $repoRoot ".codex-tmp\mastra-runtime"
$statePath = Join-Path $stateDir "state.json"

function Get-DockerReady {
  try {
    docker info | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Get-ComposeRunningServices {
  param([string]$ComposePath)

  if (-not (Test-Path $ComposePath)) {
    return @()
  }

  try {
    $services = docker compose -f $ComposePath ps --services --status running 2>$null
    if (-not $services) {
      return @()
    }

    return @($services | Where-Object { $_ -and $_.Trim() })
  } catch {
    return @()
  }
}

function Get-ContainerState {
  param([string]$ContainerName)

  if (-not $ContainerName) {
    return [ordered]@{
      name = $null
      running = $false
      status = $null
    }
  }

  try {
    $runningName = @(docker ps --filter "name=$ContainerName" --format "{{.Names}}" 2>$null | Where-Object { $_ -and $_.Trim() } | Select-Object -First 1)
    $allStatus = @(docker ps -a --filter "name=$ContainerName" --format "{{.Status}}" 2>$null | Where-Object { $_ -and $_.Trim() } | Select-Object -First 1)
    return [ordered]@{
      name = $ContainerName
      running = [bool]$runningName
      status = if ($allStatus) { [string]$allStatus } else { $null }
    }
  } catch {
    return [ordered]@{
      name = $ContainerName
      running = $false
      status = $null
    }
  }
}

function Test-StudioReachable {
  param([int]$Port)

  $url = "http://127.0.0.1:$Port"
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
    return [ordered]@{
      ok = ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
      status_code = [int]$response.StatusCode
      url = $url
    }
  } catch {
    return [ordered]@{
      ok = $false
      status_code = $null
      url = $url
    }
  }
}

function Test-EnvKeyPresent {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return $false
  }

  foreach ($rawLine in Get-Content -Path $Path) {
    $line = $rawLine.Trim()
    if (-not $line) { continue }
    if ($line.StartsWith("#")) { continue }
    if ($line -like "OPENAI_API_KEY=*") {
      $value = $line.Substring("OPENAI_API_KEY=".Length).Trim()
      return [bool]$value
    }
  }

  return $false
}

function Test-PackageJsonHasOverrides {
  param([string]$PackageJsonPath)

  if (-not (Test-Path $PackageJsonPath)) {
    return $false
  }

  try {
    $packageJson = Get-Content -Path $PackageJsonPath -Raw | ConvertFrom-Json
    if (-not ($packageJson.PSObject.Properties.Name -contains "pnpm")) {
      return $false
    }

    return [bool]($packageJson.pnpm.PSObject.Properties.Name -contains "overrides")
  } catch {
    return $false
  }
}

function Test-LockfileContainsLinks {
  param([string]$LockfilePath)

  if (-not (Test-Path $LockfilePath)) {
    return $false
  }

  return [bool](Select-String -Path $LockfilePath -Pattern "link:" -Quiet)
}

function Test-IsWithinPath {
  param(
    [string]$CandidatePath,
    [string]$RootPath
  )

  if (-not $CandidatePath -or -not $RootPath) {
    return $false
  }

  $candidateFullPath = [System.IO.Path]::GetFullPath($CandidatePath).TrimEnd('\')
  $rootFullPath = [System.IO.Path]::GetFullPath($RootPath).TrimEnd('\')
  if ($candidateFullPath.Equals($rootFullPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $true
  }

  $rootWithSeparator = "$rootFullPath\"
  return $candidateFullPath.StartsWith($rootWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-RuntimeEditorInstallState {
  param(
    [string]$StandaloneRuntimeRoot,
    [string]$UpstreamRepoRoot
  )

  $editorPath = Join-Path $StandaloneRuntimeRoot "node_modules\@mastra\editor"
  if (-not (Test-Path $editorPath)) {
    return [ordered]@{
      package = "@mastra/editor"
      link_type = $null
      target = $null
      dist_path = $null
      dist_present = $false
      from_pnpm_store = $false
      points_into_repo = $false
      ready = $false
    }
  }

  $item = Get-Item -LiteralPath $editorPath
  $targets = @($item.Target | Where-Object { $_ })
  $targetPath = if ($targets.Count) { [string]$targets[0] } else { $item.FullName }
  $distPath = Join-Path $targetPath "dist\index.js"
  $distPresent = Test-Path $distPath
  $fromPnpmStore = $targetPath.IndexOf("\.pnpm\", [System.StringComparison]::OrdinalIgnoreCase) -ge 0
  $pointsIntoRepo = Test-IsWithinPath -CandidatePath $targetPath -RootPath $UpstreamRepoRoot

  return [ordered]@{
    package = "@mastra/editor"
    link_type = $item.LinkType
    target = $targetPath
    dist_path = $distPath
    dist_present = $distPresent
    from_pnpm_store = $fromPnpmStore
    points_into_repo = $pointsIntoRepo
    ready = ($distPresent -and $fromPnpmStore -and -not $pointsIntoRepo)
  }
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

$dockerReady = Get-DockerReady
$runningServices = if ($dockerReady) { Get-ComposeRunningServices -ComposePath $composeFile } else { @() }
$studio = Test-StudioReachable -Port $StudioPort
$runtimeEditorInstall = Get-RuntimeEditorInstallState -StandaloneRuntimeRoot $RuntimeRoot -UpstreamRepoRoot $MastraRepoRoot
$runtimeLockfileContainsLinks = Test-LockfileContainsLinks -LockfilePath $runtimeLockfilePath
$runtimePackageOverridesPresent = Test-PackageJsonHasOverrides -PackageJsonPath $runtimePackageJsonPath
$runtimeContainer = if ($dockerReady) { Get-ContainerState -ContainerName $runtimeContainerName } else { [ordered]@{ name = $runtimeContainerName; running = $false; status = $null } }
$state = Read-State

$payload = [ordered]@{
  mastra_repo_root = $MastraRepoRoot
  compose_file = $composeFile
  compose_file_present = Test-Path $composeFile
  source_example_dir = $sourceExampleDir
  source_example_dir_present = Test-Path $sourceExampleDir
  runtime_root = $RuntimeRoot
  runtime_root_present = Test-Path $RuntimeRoot
  runtime_package_json_path = $runtimePackageJsonPath
  runtime_package_json_present = Test-Path $runtimePackageJsonPath
  runtime_package_overrides_present = $runtimePackageOverridesPresent
  runtime_lockfile_path = $runtimeLockfilePath
  runtime_lockfile_present = Test-Path $runtimeLockfilePath
  runtime_lockfile_contains_link = $runtimeLockfileContainsLinks
  runtime_node_modules_present = Test-Path (Join-Path $RuntimeRoot "node_modules")
  runtime_env_path = $runtimeEnvPath
  runtime_env_present = Test-Path $runtimeEnvPath
  runtime_openai_key_present = Test-EnvKeyPresent -Path $runtimeEnvPath
  runtime_dockerfile_path = $runtimeDockerfilePath
  runtime_dockerfile_present = Test-Path $runtimeDockerfilePath
  runtime_dockerignore_path = $runtimeDockerignorePath
  runtime_dockerignore_present = Test-Path $runtimeDockerignorePath
  runtime_compose_template_path = $runtimeComposeTemplatePath
  runtime_compose_template_present = Test-Path $runtimeComposeTemplatePath
  runtime_editor_install = $runtimeEditorInstall
  runtime_published_install_ready = (
    (Test-Path $runtimePackageJsonPath) -and
    (Test-Path $runtimeLockfilePath) -and
    -not $runtimePackageOverridesPresent -and
    -not $runtimeLockfileContainsLinks -and
    $runtimeEditorInstall.ready
  )
  runtime_container = $runtimeContainer
  docker_ready = $dockerReady
  compose_running_services = $runningServices
  source_env_path = $SourceEnvPath
  source_openai_key_present = Test-EnvKeyPresent -Path $SourceEnvPath
  studio_port = $StudioPort
  studio_url = $studio.url
  studio_reachable = $studio.ok
  studio_status_code = $studio.status_code
  state_path = $statePath
  state = $state
}

$result = "fail"
if (
  $payload.compose_file_present -and
  $payload.source_example_dir_present -and
  $payload.runtime_published_install_ready -and
  $payload.runtime_dockerfile_present -and
  $payload.runtime_dockerignore_present -and
  $payload.runtime_compose_template_present -and
  $payload.docker_ready -and
  $payload.runtime_container.running -and
  $payload.runtime_openai_key_present -and
  $payload.studio_reachable
) {
  $result = "ok"
} elseif (
  $payload.compose_file_present -and
  $payload.source_example_dir_present
) {
  $result = "warn"
}

$payload["result"] = $result
$payload | ConvertTo-Json -Depth 8
