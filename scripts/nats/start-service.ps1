[CmdletBinding()]
param(
  [string]$ServiceName = 'nats-server'
)

$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
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

$service = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'" -ErrorAction SilentlyContinue
if (-not $service) {
  throw "Service '$ServiceName' is not installed. Run scripts/nats/install-service.ps1 first."
}

$null = New-Item -ItemType Directory -Force -Path $runtimeRoot
$null = New-Item -ItemType Directory -Force -Path (Join-Path $runtimeRoot 'jetstream')
Write-RenderedConfig -TemplatePath $templatePath -RenderedPath $renderedConfigPath -RuntimeRoot $runtimeRoot

if ($service.State -ne 'Running') {
  Start-Service -Name $ServiceName
}

$updatedService = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'" -ErrorAction Stop
[pscustomobject]@{
  ServiceName = $ServiceName
  State = $updatedService.State
  StartMode = $updatedService.StartMode
  RenderedConfigPath = $renderedConfigPath
  RuntimeRoot = $runtimeRoot
} | ConvertTo-Json -Depth 4
