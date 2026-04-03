param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $true)]
  [string]$Region,

  [string]$ServiceName = 'blockdata-platform-api',

  [string]$ServiceAccountName = 'blockdata-platform-api-sa',

  [int]$Port = 8000,

  [int]$Cpu = 2,

  [string]$Memory = '4Gi',

  [int]$Concurrency = 8,

  [int]$TimeoutSeconds = 1800,

  [switch]$UseSecretManager,

  # If set, the script will reference an existing Secret Manager secret (and only ensure IAM binding),
  # without requiring the secret value locally.
  [switch]$UseExistingSecret,

  [string]$SecretName = 'platform-api-m2m-token',

  # If not provided, the script reads from $env:CONVERSION_SERVICE_KEY
  [string]$ConversionServiceKey,

  [string]$SupabaseUrl,

  [string]$SupabaseServiceRoleKey,

  [string]$SupabaseServiceRoleSecretName = 'supabase-service-role-key',

  [switch]$UseExistingSupabaseServiceRoleSecret,

  [string]$AppSecretEnvelopeKey,

  [string]$AppSecretEnvelopeKeySecretName = 'app-secret-envelope-key',

  [switch]$UseExistingAppSecretEnvelopeKeySecret,

  # Browser origins accepted by platform-api CORS / OAuth attempt tracking.
  # If omitted, the script will preserve the currently deployed value when possible.
  [string]$AuthRedirectOrigins = '',

  # GCS user-storage bucket name (e.g., blockdata-user-content-prod).
  # If omitted, the script will preserve the currently deployed value when possible.
  [string]$GcsUserStorageBucket = '',

  # ── OpenTelemetry contract (first-class OTEL inputs) ──
  [string]$OtelEnabled = 'false',

  [string]$OtelServiceName = 'platform-api',

  [string]$OtelServiceNamespace = 'blockdata',

  [string]$OtelDeploymentEnv = 'production',

  [string]$OtelExporterOtlpEndpoint = 'http://localhost:4318',

  [string]$OtelExporterOtlpProtocol = 'http/protobuf',

  [string]$OtelLogCorrelation = 'true',

  [string]$OtelMetricsEnabled = 'true',

  [string]$OtelLogsEnabled = 'true',

  [string]$SignozUiUrl = '',

  [string]$JaegerUiUrl = '',

  # Optional: Secret Manager secret for OTLP auth headers (comma-delimited key=value).
  [string]$OtelHeadersSecretName = '',

  [switch]$UseExistingOtelHeadersSecret
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

function Ensure-ExistingSecretAccess {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$ServiceAccountEmail
  )

  $describeExit = Invoke-GcloudAllowFail -Args @('secrets', 'describe', $Name, '--project', $ProjectId)
  if ($describeExit -ne 0) {
    throw "Secret Manager secret not found: $Name. Create it (and add a version) first."
  }

  $latestVersion = & gcloud secrets versions list $Name --project $ProjectId --limit 1 --format 'value(name)'
  if (-not $latestVersion) {
    throw "Secret Manager secret has no versions: $Name. Add a version first."
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

function Get-ExistingServiceEnvValue {
  param(
    [Parameter(Mandatory = $true)][string]$EnvName
  )

  $describeJson = & gcloud run services describe $ServiceName `
    --project $ProjectId `
    --region $Region `
    --format json 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $describeJson) {
    return $null
  }

  try {
    $service = $describeJson | ConvertFrom-Json
    $envEntries = $service.spec.template.spec.containers[0].env
    if (-not $envEntries) {
      return $null
    }

    $entry = $envEntries | Where-Object { $_.name -eq $EnvName } | Select-Object -First 1
    if ($entry -and $entry.PSObject.Properties.Name -contains 'value') {
      return [string]$entry.value
    }
  } catch {
    return $null
  }

  return $null
}

Ensure-Command -Name gcloud

if (-not (Test-Path -LiteralPath 'services/platform-api')) {
  throw "Run this script from repo root. Missing: services/platform-api"
}

Write-Host "Project: $ProjectId"
Write-Host "Region:  $Region"
Write-Host "Service: $ServiceName"

Ensure-GcloudServiceEnabled -ServiceName 'run.googleapis.com'
Ensure-GcloudServiceEnabled -ServiceName 'cloudbuild.googleapis.com'
Ensure-GcloudServiceEnabled -ServiceName 'artifactregistry.googleapis.com'
Ensure-GcloudServiceEnabled -ServiceName 'secretmanager.googleapis.com'

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
if (-not $SupabaseUrl) {
  $SupabaseUrl = $env:SUPABASE_URL
}
if (-not $SupabaseUrl) {
  throw "Missing Supabase URL. Provide -SupabaseUrl or set `$env:SUPABASE_URL."
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

if ($UseExistingSupabaseServiceRoleSecret) {
  Write-Host "Using existing Secret Manager secret for SUPABASE_SERVICE_ROLE_KEY: $SupabaseServiceRoleSecretName"
  Ensure-ExistingSecretAccess -Name $SupabaseServiceRoleSecretName -ServiceAccountEmail $runtimeServiceAccountEmail
} else {
  if (-not $SupabaseServiceRoleKey) {
    $SupabaseServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
  }
  if (-not $SupabaseServiceRoleKey) {
    if (Is-InteractiveShell) {
      $SupabaseServiceRoleKey = Read-SecretPlaintext -Prompt 'Enter SUPABASE_SERVICE_ROLE_KEY (input hidden)'
    } else {
      throw "Missing Supabase service role key. Provide -SupabaseServiceRoleKey or set `$env:SUPABASE_SERVICE_ROLE_KEY."
    }
  }
  Ensure-Secret -Name $SupabaseServiceRoleSecretName -ServiceAccountEmail $runtimeServiceAccountEmail -SecretValue $SupabaseServiceRoleKey
}

if ($UseExistingAppSecretEnvelopeKeySecret) {
  Write-Host "Using existing Secret Manager secret for APP_SECRET_ENVELOPE_KEY: $AppSecretEnvelopeKeySecretName"
  Ensure-ExistingSecretAccess -Name $AppSecretEnvelopeKeySecretName -ServiceAccountEmail $runtimeServiceAccountEmail
} else {
  if (-not $AppSecretEnvelopeKey) {
    $AppSecretEnvelopeKey = $env:APP_SECRET_ENVELOPE_KEY
  }
  if (-not $AppSecretEnvelopeKey) {
    if (Is-InteractiveShell) {
      $AppSecretEnvelopeKey = Read-SecretPlaintext -Prompt 'Enter APP_SECRET_ENVELOPE_KEY (input hidden)'
    } else {
      throw "Missing app secret envelope key. Provide -AppSecretEnvelopeKey or set `$env:APP_SECRET_ENVELOPE_KEY."
    }
  }
  Ensure-Secret -Name $AppSecretEnvelopeKeySecretName -ServiceAccountEmail $runtimeServiceAccountEmail -SecretValue $AppSecretEnvelopeKey
}

$deployArgs = @(
  'run', 'deploy', $ServiceName,
  '--project', $ProjectId,
  '--region', $Region,
  '--source', 'services/platform-api',
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

$secretMappings = @(
  "SUPABASE_SERVICE_ROLE_KEY=${SupabaseServiceRoleSecretName}:latest",
  "APP_SECRET_ENVELOPE_KEY=${AppSecretEnvelopeKeySecretName}:latest"
)

# ── OTEL env: emitted as a complete config set on every deploy ──
$envVarEntries = @(
  "SUPABASE_URL=$SupabaseUrl",
  'CONVERSION_MAX_WORKERS=2',
  "OTEL_ENABLED=$OtelEnabled",
  "OTEL_SERVICE_NAME=$OtelServiceName",
  "OTEL_SERVICE_NAMESPACE=$OtelServiceNamespace",
  "OTEL_DEPLOYMENT_ENV=$OtelDeploymentEnv",
  "OTEL_EXPORTER_OTLP_ENDPOINT=$OtelExporterOtlpEndpoint",
  "OTEL_EXPORTER_OTLP_PROTOCOL=$OtelExporterOtlpProtocol",
  "OTEL_LOG_CORRELATION=$OtelLogCorrelation",
  "OTEL_METRICS_ENABLED=$OtelMetricsEnabled",
  "OTEL_LOGS_ENABLED=$OtelLogsEnabled"
)
if ($SignozUiUrl) {
  $envVarEntries += @("SIGNOZ_UI_URL=$SignozUiUrl")
}
if ($JaegerUiUrl) {
  $envVarEntries += @("JAEGER_UI_URL=$JaegerUiUrl")
}
if (-not $AuthRedirectOrigins) {
  $AuthRedirectOrigins = $env:AUTH_REDIRECT_ORIGINS
}
if (-not $AuthRedirectOrigins) {
  $AuthRedirectOrigins = Get-ExistingServiceEnvValue -EnvName 'AUTH_REDIRECT_ORIGINS'
}
if ($AuthRedirectOrigins) {
  $envVarEntries += @("AUTH_REDIRECT_ORIGINS=$AuthRedirectOrigins")
}
if (-not $GcsUserStorageBucket) {
  $GcsUserStorageBucket = $env:GCS_USER_STORAGE_BUCKET
}
if (-not $GcsUserStorageBucket) {
  $GcsUserStorageBucket = Get-ExistingServiceEnvValue -EnvName 'GCS_USER_STORAGE_BUCKET'
}
if ($GcsUserStorageBucket) {
  $envVarEntries += @("GCS_USER_STORAGE_BUCKET=$GcsUserStorageBucket")
}
# On Cloud Run there is no local signing key. The platform-api uses
# impersonated_credentials to sign GCS URLs via the IAM signBlob API.
# The SA email is derived from the service account name and project.
$envVarEntries += @("GCS_SIGNING_SERVICE_ACCOUNT=$runtimeServiceAccountEmail")

# ── Optional: OTLP auth headers via Secret Manager ──
if ($OtelHeadersSecretName) {
  if ($UseExistingOtelHeadersSecret) {
    Write-Host "Using existing Secret Manager secret for OTEL_EXPORTER_OTLP_HEADERS: $OtelHeadersSecretName"
    Ensure-ExistingSecretAccess -Name $OtelHeadersSecretName -ServiceAccountEmail $runtimeServiceAccountEmail
  } else {
    $headersValue = $env:OTEL_EXPORTER_OTLP_HEADERS
    if (-not $headersValue) {
      if (Is-InteractiveShell) {
        $headersValue = Read-SecretPlaintext -Prompt 'Enter OTEL_EXPORTER_OTLP_HEADERS (comma-delimited key=value, input hidden)'
      } else {
        throw "Missing OTLP headers value. Provide `$env:OTEL_EXPORTER_OTLP_HEADERS or use -UseExistingOtelHeadersSecret."
      }
    }
    Ensure-Secret -Name $OtelHeadersSecretName -ServiceAccountEmail $runtimeServiceAccountEmail -SecretValue $headersValue
  }
  $secretMappings += @("OTEL_EXPORTER_OTLP_HEADERS=${OtelHeadersSecretName}:latest")
}

if ($UseSecretManager) {
  if ($UseExistingSecret) {
    Write-Host "Using existing Secret Manager secret: $SecretName"
    Ensure-ExistingSecretAccess -Name $SecretName -ServiceAccountEmail $runtimeServiceAccountEmail
  } else {
    Ensure-Secret -Name $SecretName -ServiceAccountEmail $runtimeServiceAccountEmail -SecretValue $ConversionServiceKey
  }
  $secretMappings += @("PLATFORM_API_M2M_TOKEN=${SecretName}:latest", "CONVERSION_SERVICE_KEY=${SecretName}:latest")
} else {
  $envVarEntries += @("PLATFORM_API_M2M_TOKEN=$ConversionServiceKey", "CONVERSION_SERVICE_KEY=$ConversionServiceKey")
}

$deployArgs += @('--set-secrets', ($secretMappings -join ','))
$tempEnvFile = New-TemporaryFile
try {
  $envVarMap = [ordered]@{}
  foreach ($entry in $envVarEntries) {
    $parts = $entry -split '=', 2
    if ($parts.Length -ne 2) {
      throw "Invalid env var entry: $entry"
    }
    $envVarMap[$parts[0]] = $parts[1]
  }
  [System.IO.File]::WriteAllText(
    $tempEnvFile.FullName,
    ($envVarMap | ConvertTo-Json -Compress),
    (New-Object System.Text.UTF8Encoding($false))
  )
  $deployArgs += @('--env-vars-file', $tempEnvFile.FullName)

  Write-Host "Deploying Cloud Run service..."
  & gcloud @deployArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Cloud Run deploy failed."
  }
} finally {
  Remove-Item -Force $tempEnvFile.FullName -ErrorAction SilentlyContinue
}

$url = & gcloud run services describe $ServiceName --project $ProjectId --region $Region --format 'value(status.url)'
Write-Host ""
Write-Host "Cloud Run URL: $url"
Write-Host ""
Write-Host "Next: set Supabase secrets:"
Write-Host "  PLATFORM_API_URL=$url"
Write-Host "  SUPABASE_URL=$SupabaseUrl"
Write-Host "  SUPABASE_SERVICE_ROLE_KEY -> Secret Manager secret '$SupabaseServiceRoleSecretName'"
Write-Host "  APP_SECRET_ENVELOPE_KEY -> Secret Manager secret '$AppSecretEnvelopeKeySecretName'"
Write-Host "  PLATFORM_API_M2M_TOKEN=<same shared secret>"
Write-Host "  (CONVERSION_SERVICE_URL=$url for backward compat)"
Write-Host "  (CONVERSION_SERVICE_KEY=<same shared secret> for backward compat)"
