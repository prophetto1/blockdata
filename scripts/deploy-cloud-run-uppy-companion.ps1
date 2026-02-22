param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $true)]
  [string]$Region,

  [string]$ServiceName = 'blockdata-uppy-companion',

  [string]$ServiceAccountName = 'blockdata-uppy-companion-sa',

  [int]$Port = 3020,

  [int]$Cpu = 1,

  [string]$Memory = '512Mi',

  [int]$Concurrency = 80,

  [int]$TimeoutSeconds = 300,

  # Companion session/token secret
  [string]$CompanionSecret,

  # Comma-separated CORS origins
  [string]$ClientOrigins = 'https://blockdata.vercel.app,https://blockdata.run,https://datablock.run,http://localhost:5173',

  # Comma-separated upload destination allowlist
  [string]$UploadUrls = 'https://dbdzzhshmigewyprahej.supabase.co/functions/v1/ingest'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# ---------------------------------------------------------------------------
# Helpers (mirrored from deploy-cloud-run-conversion-service.ps1)
# ---------------------------------------------------------------------------

function Ensure-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Invoke-GcloudAllowFail {
  param([Parameter(Mandatory = $true)][string[]]$Args)

  $oldPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & gcloud @Args 1>$null 2>$null
  } catch {
    # ignore
  } finally {
    $ErrorActionPreference = $oldPreference
  }

  return $LASTEXITCODE
}

function Read-SecretPlaintext {
  param([Parameter(Mandatory = $true)][string]$Prompt)

  $secure = Read-Host -Prompt $Prompt -AsSecureString
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Is-InteractiveShell {
  try {
    return ($Host.Name -eq 'ConsoleHost' -and $Host.UI -and $Host.UI.RawUI)
  } catch {
    return $false
  }
}

function Ensure-GcloudServiceEnabled {
  param([Parameter(Mandatory = $true)][string]$ServiceName)
  Write-Host "Enabling API: $ServiceName"
  & gcloud services enable $ServiceName --project $ProjectId | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to enable API: $ServiceName"
  }
}

function Ensure-ServiceAccount {
  param([Parameter(Mandatory = $true)][string]$Name)

  $email = "$Name@$ProjectId.iam.gserviceaccount.com"

  $describeExit = Invoke-GcloudAllowFail -Args @('iam', 'service-accounts', 'describe', $email, '--project', $ProjectId)
  if ($describeExit -ne 0) {
    Write-Host "Creating service account: $email"
    & gcloud iam service-accounts create $Name --project $ProjectId --display-name $Name | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to create service account: $email"
    }
  } else {
    Write-Host "Service account exists: $email"
  }

  return $email
}

function Ensure-ArtifactRegistryRepo {
  param([Parameter(Mandatory = $true)][string]$RepoName)

  $describeExit = Invoke-GcloudAllowFail -Args @('artifacts', 'repositories', 'describe', $RepoName, '--location', $Region, '--project', $ProjectId)
  if ($describeExit -ne 0) {
    Write-Host "Creating Artifact Registry repo: $RepoName ($Region)"
    & gcloud artifacts repositories create $RepoName `
      --repository-format docker `
      --location $Region `
      --project $ProjectId | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to create Artifact Registry repo: $RepoName ($Region)"
    }
  } else {
    Write-Host "Artifact Registry repo exists: $RepoName ($Region)"
  }
}

function Ensure-SecretManagerSecret {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$ServiceAccountEmail,
    [Parameter(Mandatory = $true)][string]$SecretValue
  )

  $describeExit = Invoke-GcloudAllowFail -Args @('secrets', 'describe', $Name, '--project', $ProjectId)
  if ($describeExit -ne 0) {
    Write-Host "Creating Secret Manager secret: $Name"
    & gcloud secrets create $Name --project $ProjectId --replication-policy automatic | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to create Secret Manager secret: $Name"
    }
  } else {
    Write-Host "Secret exists: $Name"
  }

  $tempFile = New-TemporaryFile
  try {
    [System.IO.File]::WriteAllText($tempFile.FullName, $SecretValue, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Adding new secret version: $Name"
    & gcloud secrets versions add $Name --project $ProjectId --data-file $tempFile.FullName | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to add secret version: $Name"
    }
  } finally {
    Remove-Item -Force $tempFile.FullName -ErrorAction SilentlyContinue
  }

  Write-Host "Granting secret accessor to runtime service account"
  & gcloud secrets add-iam-policy-binding $Name `
    --project $ProjectId `
    --member "serviceAccount:$ServiceAccountEmail" `
    --role "roles/secretmanager.secretAccessor" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to grant secret accessor: $Name -> $ServiceAccountEmail"
  }
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

Ensure-Command -Name gcloud

if (-not (Test-Path -LiteralPath 'services/uppy-companion')) {
  throw "Run this script from repo root. Missing: services/uppy-companion"
}

Write-Host "Project: $ProjectId"
Write-Host "Region:  $Region"
Write-Host "Service: $ServiceName"

Ensure-GcloudServiceEnabled -ServiceName 'run.googleapis.com'
Ensure-GcloudServiceEnabled -ServiceName 'cloudbuild.googleapis.com'
Ensure-GcloudServiceEnabled -ServiceName 'artifactregistry.googleapis.com'
Ensure-GcloudServiceEnabled -ServiceName 'secretmanager.googleapis.com'

Ensure-ArtifactRegistryRepo -RepoName 'cloud-run-source-deploy'

$runtimeServiceAccountEmail = Ensure-ServiceAccount -Name $ServiceAccountName

# ---------------------------------------------------------------------------
# Companion secret
# ---------------------------------------------------------------------------

if (-not $CompanionSecret) {
  $CompanionSecret = $env:COMPANION_SECRET
}
if (-not $CompanionSecret) {
  if (Is-InteractiveShell) {
    $CompanionSecret = Read-SecretPlaintext -Prompt 'Enter COMPANION_SECRET (input hidden)'
  } else {
    throw "Missing Companion secret. Provide -CompanionSecret or set `$env:COMPANION_SECRET."
  }
}

Ensure-SecretManagerSecret -Name 'uppy-companion-secret' -ServiceAccountEmail $runtimeServiceAccountEmail -SecretValue $CompanionSecret

# ---------------------------------------------------------------------------
# Deploy
# ---------------------------------------------------------------------------

$deployArgs = @(
  'run', 'deploy', $ServiceName,
  '--project', $ProjectId,
  '--region', $Region,
  '--source', 'services/uppy-companion',
  '--quiet',
  '--allow-unauthenticated',
  '--port', $Port,
  '--cpu', $Cpu,
  '--memory', $Memory,
  '--concurrency', $Concurrency,
  '--timeout', $TimeoutSeconds,
  '--service-account', $runtimeServiceAccountEmail,
  '--ingress', 'all',
  '--set-secrets', "COMPANION_SECRET=uppy-companion-secret:latest",
  # Use an explicit gcloud delimiter to preserve commas in env var values.
  '--set-env-vars', "^##^COMPANION_PROTOCOL=https##COMPANION_PORT=$Port##COMPANION_DATADIR=/tmp/companion-data##COMPANION_CLIENT_ORIGINS=$ClientOrigins##COMPANION_UPLOAD_URLS=$UploadUrls"
)

Write-Host "Deploying Cloud Run service..."
& gcloud @deployArgs
if ($LASTEXITCODE -ne 0) {
  throw "Cloud Run deploy failed."
}

$url = & gcloud run services describe $ServiceName --project $ProjectId --region $Region --format 'value(status.url)'

# Set COMPANION_DOMAIN to the Cloud Run hostname (without protocol)
$domain = $url -replace '^https?://', ''
Write-Host "Setting COMPANION_DOMAIN=$domain"
& gcloud run services update $ServiceName `
  --project $ProjectId `
  --region $Region `
  --update-env-vars "COMPANION_DOMAIN=$domain" | Out-Null

Write-Host ""
Write-Host "==========================================="
Write-Host "Cloud Run URL: $url"
Write-Host "==========================================="
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Set VITE_UPPY_COMPANION_URL=$url in web/.env"
Write-Host "  2. Register OAuth apps with redirect URIs:"
Write-Host "       Google Drive: $url/drive/redirect"
Write-Host "       Dropbox:      $url/dropbox/redirect"
Write-Host "       OneDrive:     $url/onedrive/redirect"
Write-Host "       Box:          $url/box/redirect"
Write-Host "  3. Set provider keys as env vars on the Cloud Run service:"
Write-Host "       gcloud run services update $ServiceName --project $ProjectId --region $Region \"
Write-Host "         --update-env-vars COMPANION_GOOGLE_KEY=...,COMPANION_GOOGLE_SECRET=..."
