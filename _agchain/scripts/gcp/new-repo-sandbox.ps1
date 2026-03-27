[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$RepoUrl,

  [Parameter()]
  [string]$Name,

  [Parameter()]
  [string]$Branch = "main",

  [Parameter()]
  [string]$Zone = "us-central1-a",

  [Parameter()]
  [string]$MachineType = "e2-standard-2",

  [Parameter()]
  [int]$BootDiskGb = 100,

  [Parameter()]
  [int]$TtlHours = 8,

  [Parameter()]
  [string]$Owner = "jon",

  [Parameter()]
  [switch]$Spot,

  [Parameter()]
  [switch]$Autostart
)

$ErrorActionPreference = "Stop"

function Ensure-Gcloud {
  $cmd = Get-Command gcloud -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "gcloud not found on PATH. Install Google Cloud SDK and re-run."
  }
}

function Get-GcloudProject {
  $project = (& gcloud config get-value project 2>$null).Trim()
  if (-not $project -or $project -eq "(unset)") {
    throw "No gcloud project set. Run: gcloud config set project <YOUR_PROJECT_ID>"
  }
  return $project
}

function Ensure-ApiEnabled([string]$Project, [string]$ServiceName) {
  $enabled = (& gcloud services list --enabled --project $Project --format="value(config.name)" 2>$null) -split "`n"
  if ($enabled -contains $ServiceName) {
    return
  }
  Write-Host "Enabling API: $ServiceName" -ForegroundColor Cyan
  & gcloud services enable $ServiceName --project $Project | Out-Host
}

function Ensure-IapSshFirewall([string]$Project) {
  $ruleName = "repo-sandbox-allow-iap-ssh"
  $existing = (& gcloud compute firewall-rules describe $ruleName --project $Project --format="value(name)" 2>$null).Trim()
  if ($existing) {
    return $ruleName
  }

  Write-Host "Creating firewall rule for IAP SSH: $ruleName" -ForegroundColor Cyan
  & gcloud compute firewall-rules create $ruleName `
    --project $Project `
    --direction=INGRESS `
    --priority=1000 `
    --network=default `
    --action=ALLOW `
    --rules=tcp:22 `
    --source-ranges=35.235.240.0/20 `
    --target-tags=iap-ssh | Out-Host

  return $ruleName
}

function Normalize-LabelValue([string]$Value) {
  $v = $Value.ToLowerInvariant()
  $v = $v -replace "[^a-z0-9-]", "-"
  $v = $v.Trim("-")
  if (-not $v) {
    return "x"
  }
  if ($v.Length -gt 63) {
    return $v.Substring(0, 63).Trim("-")
  }
  return $v
}

function Get-TtlLabel([int]$Hours) {
  $utc = (Get-Date).ToUniversalTime().AddHours($Hours)
  return $utc.ToString("yyyyMMddHHmm")
}

Ensure-Gcloud

$project = Get-GcloudProject
Write-Host "Project: $project" -ForegroundColor DarkGray

Ensure-ApiEnabled -Project $project -ServiceName "compute.googleapis.com"
Ensure-ApiEnabled -Project $project -ServiceName "iap.googleapis.com"
Ensure-IapSshFirewall -Project $project | Out-Null

$repoLeaf = ($RepoUrl.TrimEnd("/") -split "/")[-1]
$repoShort = Normalize-LabelValue ([IO.Path]::GetFileNameWithoutExtension($repoLeaf))
$safeTimestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmm")
if (-not $Name) {
  $Name = "repo-sbx-$repoShort-$safeTimestamp"
}
$ttlLabel = Get-TtlLabel -Hours $TtlHours
$ownerLabel = Normalize-LabelValue $Owner

$labels = @(
  "purpose=repo-sandbox",
  "repo=$repoShort",
  "owner=$ownerLabel",
  "ttl=$ttlLabel"
) -join ","

$sandboxRoot = Join-Path $PWD ".gcp"
$startupDir = Join-Path $sandboxRoot "startup"
$manifestDir = Join-Path $sandboxRoot "sandboxes"
New-Item -ItemType Directory -Force -Path $startupDir | Out-Null
New-Item -ItemType Directory -Force -Path $manifestDir | Out-Null

$startupPath = Join-Path $startupDir "$Name.startup.sh"
$manifestPath = Join-Path $manifestDir "$Name.json"

if (Test-Path -LiteralPath $manifestPath) {
  throw "Manifest already exists (refusing to overwrite): $manifestPath"
}

$autostartValue = if ($Autostart) { "1" } else { "0" }

$startupScript = @"
#!/usr/bin/env bash
set -euo pipefail

LOG=/var/log/repo-sandbox-startup.log
exec > >(tee -a "\$LOG") 2>&1

echo "[repo-sandbox] startup begin: \$(date -Is)"

get_attr() {
  local key="\$1"
  curl -fsSL -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/attributes/\$key"
}

REPO_URL="\$(get_attr repo_url)"
REPO_BRANCH="\$(get_attr repo_branch)"
AUTOSTART="\$(get_attr autostart)"

echo "[repo-sandbox] repo_url=\$REPO_URL"
echo "[repo-sandbox] repo_branch=\$REPO_BRANCH"
echo "[repo-sandbox] autostart=\$AUTOSTART"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl git docker.io docker-compose-plugin
systemctl enable --now docker

mkdir -p /opt
if [ ! -d /opt/repo ]; then
  git clone "\$REPO_URL" /opt/repo
fi
cd /opt/repo
git fetch --all --prune
git checkout "\$REPO_BRANCH" || git checkout -b "\$REPO_BRANCH" "origin/\$REPO_BRANCH"

if [ "\$AUTOSTART" = "1" ]; then
  COMPOSE_FILE=""
  for f in docker-compose.yml docker-compose.yaml compose.yml compose.yaml; do
    if [ -f "\$f" ]; then
      COMPOSE_FILE="\$f"
      break
    fi
  done
  if [ -n "\$COMPOSE_FILE" ]; then
    echo "[repo-sandbox] compose detected: \$COMPOSE_FILE"
    cat >/etc/systemd/system/repo-sandbox.service <<'UNIT'
[Unit]
Description=Repo Sandbox Autostart (docker compose)
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/repo
ExecStart=/usr/bin/docker compose up -d --build
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
UNIT
    systemctl daemon-reload
    systemctl enable --now repo-sandbox.service
  else
    echo "[repo-sandbox] autostart requested but no compose file found; skipping."
  fi
fi

echo "[repo-sandbox] startup complete: \$(date -Is)"
"@

$startupScript | Out-File -FilePath $startupPath -Encoding utf8 -Force

$provisioningModelArgs = @()
if ($Spot) {
  $provisioningModelArgs = @("--provisioning-model=SPOT")
}

Write-Host "Creating instance: $Name (zone=$Zone, machine=$MachineType, disk=${BootDiskGb}GB, repo=$RepoUrl)" -ForegroundColor Cyan

& gcloud compute instances create $Name `
  --project $project `
  --zone $Zone `
  --machine-type $MachineType `
  --boot-disk-size "$BootDiskGb"GB `
  --image-family ubuntu-2204-lts `
  --image-project ubuntu-os-cloud `
  --no-address `
  --tags "repo-sandbox,iap-ssh" `
  --labels $labels `
  --metadata "repo_url=$RepoUrl,repo_branch=$Branch,autostart=$autostartValue" `
  --metadata-from-file "startup-script=$startupPath" `
  @provisioningModelArgs | Out-Host

$manifest = [ordered]@{
  name = $Name
  repo_url = $RepoUrl
  branch = $Branch
  project = $project
  zone = $Zone
  machine_type = $MachineType
  boot_disk_gb = $BootDiskGb
  spot = [bool]$Spot
  autostart = [bool]$Autostart
  labels = $labels
  ttl_utc_label = $ttlLabel
  created_at_utc = (Get-Date).ToUniversalTime().ToString("o")
  startup_script_file = $startupPath
}

$manifest | ConvertTo-Json -Depth 6 | Out-File -FilePath $manifestPath -Encoding utf8 -Force

Write-Host "Wrote manifest: $manifestPath" -ForegroundColor DarkGray
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gcp/ssh-repo-sandbox.ps1 -Name $Name" -ForegroundColor Gray
Write-Host "  (optional) powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gcp/ssh-repo-sandbox.ps1 -Name $Name -PortForward 3000:3000" -ForegroundColor Gray
