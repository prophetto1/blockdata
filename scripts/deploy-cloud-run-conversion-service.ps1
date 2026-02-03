param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $true)]
  [string]$Region,

  [string]$ServiceName = 'writing-system-conversion-service',

  [string]$ServiceAccountName = 'writing-system-conversion-sa',

  [int]$Port = 8000,

  [int]$Cpu = 2,

  [string]$Memory = '4Gi',

  [int]$Concurrency = 1,

  [int]$TimeoutSeconds = 1800,

  [switch]$UseSecretManager,

  # If set, the script will reference an existing Secret Manager secret (and only ensure IAM binding),
  # without requiring the secret value locally.
  [switch]$UseExistingSecret,

  [string]$SecretName = 'conversion-service-key',

  # If not provided, the script reads from $env:CONVERSION_SERVICE_KEY
  [string]$ConversionServiceKey
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

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

function Ensure-Secret {
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

Ensure-Command -Name gcloud

if (-not (Test-Path -LiteralPath 'services/conversion-service')) {
  throw "Run this script from repo root. Missing: services/conversion-service"
}

Write-Host "Project: $ProjectId"
Write-Host "Region:  $Region"
Write-Host "Service: $ServiceName"

Ensure-GcloudServiceEnabled -ServiceName 'run.googleapis.com'
Ensure-GcloudServiceEnabled -ServiceName 'cloudbuild.googleapis.com'
Ensure-GcloudServiceEnabled -ServiceName 'artifactregistry.googleapis.com'
if ($UseSecretManager) {
  Ensure-GcloudServiceEnabled -ServiceName 'secretmanager.googleapis.com'
}

# Cloud Run source deployments typically use an Artifact Registry repo named like this.
# If your org policy disallows auto-creation, this avoids a deploy-time failure.
Ensure-ArtifactRegistryRepo -RepoName 'cloud-run-source-deploy'

$runtimeServiceAccountEmail = Ensure-ServiceAccount -Name $ServiceAccountName

if ($UseExistingSecret -and -not $UseSecretManager) {
  throw "UseExistingSecret requires -UseSecretManager."
}
if ($UseExistingSecret -and -not $SecretName) {
  throw "UseExistingSecret requires -SecretName."
}

if (-not $UseExistingSecret) {
  if (-not $ConversionServiceKey) {
    $ConversionServiceKey = $env:CONVERSION_SERVICE_KEY
  }
  if (-not $ConversionServiceKey) {
    if (Is-InteractiveShell) {
      $ConversionServiceKey = Read-SecretPlaintext -Prompt 'Enter CONVERSION_SERVICE_KEY (input hidden)'
    } else {
      throw "Missing conversion shared secret. Provide -ConversionServiceKey or set `$env:CONVERSION_SERVICE_KEY."
    }
  }
}

$deployArgs = @(
  'run', 'deploy', $ServiceName,
  '--project', $ProjectId,
  '--region', $Region,
  '--source', 'services/conversion-service',
  '--quiet',
  '--allow-unauthenticated',
  '--port', $Port,
  '--cpu', $Cpu,
  '--memory', $Memory,
  '--concurrency', $Concurrency,
  '--timeout', $TimeoutSeconds,
  '--service-account', $runtimeServiceAccountEmail,
  '--ingress', 'all'
)

if ($UseSecretManager) {
  if ($UseExistingSecret) {
    Write-Host "Using existing Secret Manager secret: $SecretName"
    $describeExit = Invoke-GcloudAllowFail -Args @('secrets', 'describe', $SecretName, '--project', $ProjectId)
    if ($describeExit -ne 0) {
      throw "Secret Manager secret not found: $SecretName. Create it (and add a version) first, or omit -UseExistingSecret."
    }

    $latestVersion = & gcloud secrets versions list $SecretName --project $ProjectId --limit 1 --format 'value(name)'
    if (-not $latestVersion) {
      throw "Secret Manager secret has no versions: $SecretName. Add a version first (Secret Manager -> Add version), or omit -UseExistingSecret."
    }

    Write-Host "Granting secret accessor to runtime service account"
    & gcloud secrets add-iam-policy-binding $SecretName `
      --project $ProjectId `
      --member "serviceAccount:$runtimeServiceAccountEmail" `
      --role "roles/secretmanager.secretAccessor" | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to grant secret accessor: $SecretName -> $runtimeServiceAccountEmail"
    }
  } else {
    Ensure-Secret -Name $SecretName -ServiceAccountEmail $runtimeServiceAccountEmail -SecretValue $ConversionServiceKey
  }
  $deployArgs += @('--set-secrets', "CONVERSION_SERVICE_KEY=${SecretName}:latest")
} else {
  $deployArgs += @('--set-env-vars', "CONVERSION_SERVICE_KEY=$ConversionServiceKey")
}

Write-Host "Deploying Cloud Run service..."
& gcloud @deployArgs
if ($LASTEXITCODE -ne 0) {
  throw "Cloud Run deploy failed."
}

$url = & gcloud run services describe $ServiceName --project $ProjectId --region $Region --format 'value(status.url)'
Write-Host ""
Write-Host "Cloud Run URL: $url"
Write-Host ""
Write-Host "Next: set Supabase secrets:"
Write-Host "  CONVERSION_SERVICE_URL=$url"
Write-Host "  CONVERSION_SERVICE_KEY=<same shared secret>"
