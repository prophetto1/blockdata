[CmdletBinding()]
param(
  [string]$ServiceName = 'nats-coordination'
)

$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

$repoRoot = Resolve-RepoRoot
$runtimeRoot = Join-Path $repoRoot '.codex-tmp\nats-runtime'
$templatePath = Join-Path $repoRoot 'ops\nats\nats-server.conf'
$renderedConfigPath = Join-Path $runtimeRoot 'nats-server.rendered.conf'

$service = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'" -ErrorAction SilentlyContinue

if (-not $service) {
  [pscustomobject]@{
    ServiceName = $ServiceName
    Installed = $false
    TemplatePath = $templatePath
    RenderedConfigPath = $renderedConfigPath
    RuntimeRoot = $runtimeRoot
  } | ConvertTo-Json -Depth 4
  return
}

[pscustomobject]@{
  ServiceName = $ServiceName
  Installed = $true
  State = $service.State
  StartMode = $service.StartMode
  BinaryPath = $service.PathName
  TemplatePath = $templatePath
  RenderedConfigPath = $renderedConfigPath
  RuntimeRoot = $runtimeRoot
} | ConvertTo-Json -Depth 4
