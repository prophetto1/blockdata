[CmdletBinding()]
param(
  [string]$ServiceName = 'nats-coordination'
)

$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Resolve-NatsServerPath {
  if ($env:NATS_SERVER_EXE) {
    return (Resolve-Path $env:NATS_SERVER_EXE).Path
  }

  $command = Get-Command nats-server.exe -ErrorAction SilentlyContinue
  if (-not $command) {
    $command = Get-Command nats-server -ErrorAction SilentlyContinue
  }
  if (-not $command) {
    throw 'Unable to resolve nats-server. Install it on PATH or set NATS_SERVER_EXE.'
  }

  return $command.Source
}

function New-RuntimeLayout([string]$RuntimeRoot) {
  $null = New-Item -ItemType Directory -Force -Path $RuntimeRoot
  $null = New-Item -ItemType Directory -Force -Path (Join-Path $RuntimeRoot 'jetstream')
}

function Write-RenderedConfig([string]$TemplatePath, [string]$RenderedPath, [string]$RuntimeRoot) {
  $runtimeRootForConfig = $RuntimeRoot.Replace('\', '/')
  $template = Get-Content $TemplatePath -Raw
  $rendered = $template.Replace('{{RUNTIME_ROOT}}', $runtimeRootForConfig)
  Set-Content -Path $RenderedPath -Value $rendered -NoNewline
}

$repoRoot = Resolve-RepoRoot
$templatePath = Join-Path $repoRoot 'ops\nats\nats-server.conf'
$runtimeRoot = Join-Path $repoRoot '.codex-tmp\nats-runtime'
$renderedConfigPath = Join-Path $runtimeRoot 'nats-server.rendered.conf'

New-RuntimeLayout -RuntimeRoot $runtimeRoot
Write-RenderedConfig -TemplatePath $templatePath -RenderedPath $renderedConfigPath -RuntimeRoot $runtimeRoot

$binaryPath = Resolve-NatsServerPath
$binPath = "`"$binaryPath`" -c `"$renderedConfigPath`""
$service = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'" -ErrorAction SilentlyContinue

if ($service) {
  & sc.exe config $ServiceName "binPath= $binPath" "start= auto" | Out-Null
} else {
  & sc.exe create $ServiceName "binPath= $binPath" "start= auto" "DisplayName= NATS Coordination" | Out-Null
}

& sc.exe description $ServiceName 'NATS + JetStream broker for writing-system coordination runtime' | Out-Null

$updatedService = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'" -ErrorAction Stop
[pscustomobject]@{
  ServiceName = $ServiceName
  Installed = $true
  State = $updatedService.State
  StartMode = $updatedService.StartMode
  BinaryPath = $updatedService.PathName
  TemplatePath = $templatePath
  RenderedConfigPath = $renderedConfigPath
  RuntimeRoot = $runtimeRoot
} | ConvertTo-Json -Depth 4
