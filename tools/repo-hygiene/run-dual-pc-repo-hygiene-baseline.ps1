param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('BUDDY', 'JON')]
  [string]$RunnerLabel,

  [ValidateSet('1', '2', '5')]
  [string[]]$Lanes = @('1', '2', '5'),

  [string]$RepoRoot,
  [string]$PeerRoot,
  [string]$ArtifactRoot
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

function Assert-PathExists {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PathValue,

    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  if (-not (Test-Path -LiteralPath $PathValue)) {
    throw "$Label does not exist: $PathValue"
  }
}

function Assert-FileExists {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PathValue,

    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  if (-not (Test-Path -LiteralPath $PathValue -PathType Leaf)) {
    throw "$Label not found: $PathValue"
  }
}

function Invoke-NodeLane {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Description,

    [Parameter(Mandatory = $true)]
    [string]$ScriptPath,

    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,

    [string]$StdoutPath
  )

  Write-Host "==> $Description"
  if ($StdoutPath) {
    & node $ScriptPath @Arguments | Out-File -FilePath $StdoutPath -Encoding utf8
  } else {
    & node $ScriptPath @Arguments
  }

  if ($LASTEXITCODE -ne 0) {
    throw "$Description failed with exit code $LASTEXITCODE"
  }
}

$config = Get-DefaultConfig -Runner $RunnerLabel

$resolvedRepoRoot = if ($RepoRoot) { $RepoRoot } else { $config.RepoRoot }
$resolvedPeerRoot = if ($PeerRoot) { $PeerRoot } else { $config.PeerRoot }
$resolvedArtifactRoot = if ($ArtifactRoot) { $ArtifactRoot } else { $config.ArtifactRoot }
$peerLabel = $config.PeerLabel

Assert-PathExists -PathValue $resolvedRepoRoot -Label 'Repo root'
Assert-PathExists -PathValue $resolvedPeerRoot -Label 'Peer root'

New-Item -ItemType Directory -Force -Path $resolvedArtifactRoot | Out-Null

$hardcodedPathsScript = Join-Path $resolvedRepoRoot '_collaborate\scripts\repo-hygiene\normalize-hardcoded-paths.mjs'
$gitignoreImpactScript = Join-Path $resolvedRepoRoot '_collaborate\scripts\repo-hygiene\report-gitignore-impact.mjs'
$hookInventoryScript = Join-Path $resolvedRepoRoot '_collaborate\scripts\repo-hygiene\report-hook-inventory.mjs'

$originalLocation = Get-Location

try {
  Set-Location -LiteralPath $resolvedRepoRoot

  if ($Lanes -contains '1') {
    Assert-FileExists -PathValue $hardcodedPathsScript -Label 'Lane 1 hardcoded path script'
    Invoke-NodeLane `
      -Description 'Lane 1 - hardcoded paths' `
      -ScriptPath $hardcodedPathsScript `
      -Arguments @(
        '--alias-root', $resolvedPeerRoot,
        '--report', (Join-Path $resolvedArtifactRoot '10-hardcoded-paths-repo.md'),
        '--json'
      ) `
      -StdoutPath (Join-Path $resolvedArtifactRoot '10-hardcoded-paths-repo.json')
  }

  if ($Lanes -contains '2') {
    Assert-FileExists -PathValue $gitignoreImpactScript -Label 'Lane 2 gitignore impact script'
    Invoke-NodeLane `
      -Description 'Lane 2 - .gitignore impact' `
      -ScriptPath $gitignoreImpactScript `
      -Arguments @(
        '--repo-root', $resolvedRepoRoot,
        '--output', (Join-Path $resolvedArtifactRoot '20-gitignore-impact.md'),
        '--json-output', (Join-Path $resolvedArtifactRoot '20-gitignore-impact.json')
      )
  }

  if ($Lanes -contains '5') {
    Assert-FileExists -PathValue $hookInventoryScript -Label 'Lane 5 hook inventory script'
    Invoke-NodeLane `
      -Description 'Lane 5 - hook inventory (self)' `
      -ScriptPath $hookInventoryScript `
      -Arguments @(
        '--repo-root', $resolvedRepoRoot,
        '--label', $RunnerLabel,
        '--output', (Join-Path $resolvedArtifactRoot ("50-hooks-inventory-{0}.md" -f $RunnerLabel.ToLowerInvariant()))
      )

    Invoke-NodeLane `
      -Description 'Lane 5 - hook inventory (peer)' `
      -ScriptPath $hookInventoryScript `
      -Arguments @(
        '--repo-root', $resolvedPeerRoot,
        '--label', $peerLabel,
        '--output', (Join-Path $resolvedArtifactRoot '51-hooks-inventory-peer.md')
      )
  }
}
finally {
  Set-Location -LiteralPath $originalLocation
}
