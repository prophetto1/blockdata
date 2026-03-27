[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Name,

  [Parameter()]
  [string]$Zone,

  [Parameter()]
  [string]$Project,

  [Parameter()]
  [string]$PortForward
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

$sshArgs = @(
  "compute", "ssh", $Name,
  "--project", $Project,
  "--zone", $Zone,
  "--tunnel-through-iap"
)

if ($PortForward) {
  if ($PortForward -notmatch "^[0-9]+:[0-9]+$") {
    throw "PortForward must be like '3000:3000' (local:remote). Got: $PortForward"
  }
  $local, $remote = $PortForward.Split(":")
  $sshArgs += "--"
  $sshArgs += "-L"
  $sshArgs += "$local`:localhost`:$remote"
}

Write-Host "gcloud $($sshArgs -join ' ')" -ForegroundColor DarkGray
& gcloud @sshArgs

