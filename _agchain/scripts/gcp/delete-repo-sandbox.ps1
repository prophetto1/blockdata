[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Name,

  [Parameter()]
  [string]$Zone,

  [Parameter()]
  [string]$Project,

  [Parameter()]
  [switch]$PurgeLocal
)

$ErrorActionPreference = "Stop"

function Ensure-Gcloud {
  $cmd = Get-Command gcloud -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "gcloud not found on PATH. Install Google Cloud SDK and re-run."
  }
}

function Load-Manifest([string]$SandboxName) {
  $path = Join-Path $PWD ".gcp/sandboxes/$SandboxName.json"
  if (-not (Test-Path -LiteralPath $path)) {
    return $null
  }
  return Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
}

Ensure-Gcloud

$m = Load-Manifest -SandboxName $Name
if (-not $Project) {
  $Project = if ($m) { $m.project } else { (& gcloud config get-value project).Trim() }
}
if (-not $Zone) {
  $Zone = if ($m) { $m.zone } else { "us-central1-a" }
}
if (-not $Project -or $Project -eq "(unset)") {
  throw "No project found. Set gcloud default project or pass -Project."
}

Write-Host "Deleting instance: $Name (project=$Project zone=$Zone)" -ForegroundColor Cyan
& gcloud compute instances delete $Name --project $Project --zone $Zone --quiet | Out-Host

if ($PurgeLocal) {
  $manifestPath = Join-Path $PWD ".gcp/sandboxes/$Name.json"
  $startupPath = Join-Path $PWD ".gcp/startup/$Name.startup.sh"

  if (Test-Path -LiteralPath $manifestPath) {
    Remove-Item -LiteralPath $manifestPath -Force
  }
  if (Test-Path -LiteralPath $startupPath) {
    Remove-Item -LiteralPath $startupPath -Force
  }
  Write-Host "Purged local files under .gcp/ for $Name" -ForegroundColor DarkGray
}

