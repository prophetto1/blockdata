[CmdletBinding()]
param(
  [string]$ServiceName = 'nats-server'
)

$ErrorActionPreference = 'Stop'

function Get-ServiceInstance([string]$ServiceName) {
  return Get-CimInstance Win32_Service -Filter "Name='$ServiceName'" -ErrorAction SilentlyContinue
}

function Resolve-ServiceChangeFailure([uint32]$ReturnValue) {
  switch ($ReturnValue) {
    2 { return 'Access denied while changing the service configuration.' }
    21 { return 'Invalid parameter passed to Win32_Service.Change.' }
    default { return "Win32_Service.Change returned $ReturnValue." }
  }
}

function Invoke-ScCommand([string[]]$Arguments, [string]$FailureMessage) {
  $stdoutPath = [System.IO.Path]::GetTempFileName()
  $stderrPath = [System.IO.Path]::GetTempFileName()

  try {
    $process = Start-Process -FilePath 'sc.exe' -ArgumentList $Arguments -Wait -NoNewWindow -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath

    $output = @()
    if (Test-Path $stdoutPath) {
      $output += Get-Content $stdoutPath
    }
    if (Test-Path $stderrPath) {
      $output += Get-Content $stderrPath
    }

    if ($process.ExitCode -ne 0) {
      $detail = if ($output.Count -gt 0) {
        ($output | Out-String).Trim()
      } else {
        'sc.exe exited with a non-zero code and did not return output.'
      }
      throw "$FailureMessage`n$detail"
    }

    return $output
  } finally {
    Remove-Item $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
  }
}

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
$service = Get-ServiceInstance -ServiceName $ServiceName

if ($service) {
  $changeResult = Invoke-CimMethod -InputObject $service -MethodName Change -Arguments @{
    DisplayName = 'NATS Coordination'
    PathName = $binPath
    StartMode = 'Automatic'
  }
  if ($changeResult.ReturnValue -ne 0) {
    $reason = Resolve-ServiceChangeFailure -ReturnValue $changeResult.ReturnValue
    throw "Failed to update service '$ServiceName'. $reason"
  }
} else {
  try {
    New-Service -Name $ServiceName -BinaryPathName $binPath -DisplayName 'NATS Coordination' -StartupType Automatic -ErrorAction Stop | Out-Null
  } catch {
    throw "Failed to install service '$ServiceName'. $($_.Exception.Message)"
  }
}

Invoke-ScCommand -Arguments @(
  'description',
  $ServiceName,
  'NATS + JetStream broker for writing-system coordination runtime'
) -FailureMessage "Failed to set the description for service '$ServiceName'."

$updatedService = Get-ServiceInstance -ServiceName $ServiceName
if (-not $updatedService) {
  throw "Service '$ServiceName' was not found after install/update."
}

if ([string]::IsNullOrWhiteSpace($updatedService.PathName)) {
  throw "Service '$ServiceName' exists after install/update but did not report a binary path."
}

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
