param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('BUDDY', 'JON')]
  [string]$RunnerLabel,

  [ValidateSet('1', '2', '5')]
  [string[]]$Lanes = @('1', '2', '5'),

  [string]$RepoRoot,
  [string]$PeerRoot,
  [string]$ArtifactRoot,

  [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-DefaultConfig {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('BUDDY', 'JON')]
    [string]$Runner
  )

  switch ($Runner) {
    'BUDDY' {
      return @{
        RepoRoot     = 'E:\blockdata-agchain'
        PeerRoot     = 'P:\writing-system'
        ArtifactRoot = 'P:\writing-system\_collaborate\work-requests\0409-repo-health\artifacts\2026-04-09-baseline-v1'
        PeerLabel    = 'JON'
      }
    }
    'JON' {
      return @{
        RepoRoot     = 'E:\writing-system'
        PeerRoot     = 'Y:\blockdata-agchain'
        ArtifactRoot = 'E:\writing-system\_collaborate\work-requests\0409-repo-health\artifacts\2026-04-09-baseline-v1'
        PeerLabel    = 'BUDDY'
      }
    }
    default {
      throw "Unsupported runner label: $Runner"
    }
  }
}

function Test-Leaf {
  param([string]$PathValue)
  return [bool](Test-Path -LiteralPath $PathValue -PathType Leaf)
}

function Test-Container {
  param([string]$PathValue)
  return [bool](Test-Path -LiteralPath $PathValue -PathType Container)
}

function Get-FileMetric {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PathValue
  )

  if (-not (Test-Leaf -PathValue $PathValue)) {
    return [pscustomobject]@{
      path          = $PathValue
      exists        = $false
      lengthBytes   = $null
      lastWriteTime = $null
    }
  }

  $item = Get-Item -LiteralPath $PathValue
  return [pscustomobject]@{
    path          = $PathValue
    exists        = $true
    lengthBytes   = $item.Length
    lastWriteTime = $item.LastWriteTime.ToString('s')
  }
}

function Get-LaneOutputMetrics {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$OutputPaths
  )

  return @($OutputPaths | ForEach-Object { Get-FileMetric -PathValue $_ })
}

function Get-NodeMetrics {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if (-not $nodeCommand) {
    return [pscustomobject]@{
      available = $false
      path      = $null
      version   = $null
    }
  }

  $version = (& node --version).Trim()
  return [pscustomobject]@{
    available = $true
    path      = $nodeCommand.Source
    version   = $version
  }
}

$config = Get-DefaultConfig -Runner $RunnerLabel

$resolvedRepoRoot = if ($RepoRoot) { $RepoRoot } else { $config.RepoRoot }
$resolvedPeerRoot = if ($PeerRoot) { $PeerRoot } else { $config.PeerRoot }
$resolvedArtifactRoot = if ($ArtifactRoot) { $ArtifactRoot } else { $config.ArtifactRoot }
$peerLabel = $config.PeerLabel

$repoRootExists = Test-Container -PathValue $resolvedRepoRoot
$peerRootExists = Test-Container -PathValue $resolvedPeerRoot
$artifactRootExists = Test-Container -PathValue $resolvedArtifactRoot
$nodeMetrics = Get-NodeMetrics

$artifactFiles = @()
if ($artifactRootExists) {
  $artifactFiles = @(Get-ChildItem -LiteralPath $resolvedArtifactRoot -File -ErrorAction SilentlyContinue)
}

$hardcodedPathsScript = Join-Path $resolvedRepoRoot '_collaborate\scripts\repo-hygiene\normalize-hardcoded-paths.mjs'
$gitignoreImpactScript = Join-Path $resolvedRepoRoot '_collaborate\scripts\repo-hygiene\report-gitignore-impact.mjs'
$hookInventoryScript = Join-Path $resolvedRepoRoot '_collaborate\scripts\repo-hygiene\report-hook-inventory.mjs'

$laneDefinitions = @{
  '1' = @{
    name        = 'hardcoded-paths'
    description = 'Lane 1 - hardcoded paths'
    scriptPath  = $hardcodedPathsScript
    outputPaths = @(
      (Join-Path $resolvedArtifactRoot '10-hardcoded-paths-repo.md'),
      (Join-Path $resolvedArtifactRoot '10-hardcoded-paths-repo.json')
    )
  }
  '2' = @{
    name        = 'gitignore-impact'
    description = 'Lane 2 - .gitignore impact'
    scriptPath  = $gitignoreImpactScript
    outputPaths = @(
      (Join-Path $resolvedArtifactRoot '20-gitignore-impact.md'),
      (Join-Path $resolvedArtifactRoot '20-gitignore-impact.json')
    )
  }
  '5' = @{
    name        = 'hook-inventory'
    description = 'Lane 5 - hook inventory'
    scriptPath  = $hookInventoryScript
    outputPaths = @(
      (Join-Path $resolvedArtifactRoot ("50-hooks-inventory-{0}.md" -f $RunnerLabel.ToLowerInvariant())),
      (Join-Path $resolvedArtifactRoot '51-hooks-inventory-peer.md')
    )
  }
}

$laneMetrics = foreach ($lane in $Lanes) {
  $definition = $laneDefinitions[$lane]
  $scriptExists = Test-Leaf -PathValue $definition.scriptPath
  $outputMetrics = Get-LaneOutputMetrics -OutputPaths $definition.outputPaths
  $existingOutputs = @($outputMetrics | Where-Object { $_.exists })

  [pscustomobject]@{
    lane               = $lane
    name               = $definition.name
    description        = $definition.description
    scriptPath         = $definition.scriptPath
    scriptExists       = $scriptExists
    runnableNow        = ($nodeMetrics.available -and $repoRootExists -and $peerRootExists -and $scriptExists)
    outputCount        = $outputMetrics.Count
    existingOutputCount = $existingOutputs.Count
    outputs            = $outputMetrics
  }
}

$status = [pscustomobject]@{
  timestamp             = (Get-Date).ToString('s')
  runnerLabel           = $RunnerLabel
  peerLabel             = $peerLabel
  currentHost           = $env:COMPUTERNAME
  repoRoot              = $resolvedRepoRoot
  peerRoot              = $resolvedPeerRoot
  artifactRoot          = $resolvedArtifactRoot
  repoRootExists        = $repoRootExists
  peerRootExists        = $peerRootExists
  artifactRootExists    = $artifactRootExists
  node                  = $nodeMetrics
  requestedLaneCount    = $Lanes.Count
  runnableLaneCount     = @($laneMetrics | Where-Object { $_.runnableNow }).Count
  missingLaneScriptCount = @($laneMetrics | Where-Object { -not $_.scriptExists }).Count
  artifactFileCount     = $artifactFiles.Count
  laneMetrics           = $laneMetrics
}

if ($Json) {
  $status | ConvertTo-Json -Depth 8
  exit 0
}

Write-Host "Dual-PC baseline dry run"
Write-Host "  Runner:          $($status.runnerLabel)"
Write-Host "  Peer:            $($status.peerLabel)"
Write-Host "  Current host:    $($status.currentHost)"
Write-Host "  Repo root:       $($status.repoRoot)"
Write-Host "  Repo root exists: $($status.repoRootExists)"
Write-Host "  Peer root:       $($status.peerRoot)"
Write-Host "  Peer root exists: $($status.peerRootExists)"
Write-Host "  Artifact root:   $($status.artifactRoot)"
Write-Host "  Artifact exists: $($status.artifactRootExists)"
Write-Host "  Artifact files:  $($status.artifactFileCount)"
Write-Host "  Node available:  $($status.node.available)"
if ($status.node.available) {
  Write-Host "  Node version:    $($status.node.version)"
}
Write-Host "  Requested lanes: $($status.requestedLaneCount)"
Write-Host "  Runnable lanes:  $($status.runnableLaneCount)"
Write-Host "  Missing scripts: $($status.missingLaneScriptCount)"
Write-Host ""

foreach ($laneMetric in $laneMetrics) {
  Write-Host "[$($laneMetric.lane)] $($laneMetric.description)"
  Write-Host "  Script exists:   $($laneMetric.scriptExists)"
  Write-Host "  Runnable now:    $($laneMetric.runnableNow)"
  Write-Host "  Existing outputs: $($laneMetric.existingOutputCount)/$($laneMetric.outputCount)"
  foreach ($output in $laneMetric.outputs) {
    $stamp = if ($output.lastWriteTime) { $output.lastWriteTime } else { '-' }
    $size = if ($null -ne $output.lengthBytes) { $output.lengthBytes } else { '-' }
    Write-Host "    - exists=$($output.exists) size=$size updated=$stamp path=$($output.path)"
  }
  Write-Host ""
}
