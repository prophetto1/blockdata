param(
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$controlScriptPath = Join-Path $scriptDir "platform-api-dev-control.ps1"

$statusRaw = (& $controlScriptPath -Action status -Port $Port) -join [Environment]::NewLine
if ($LASTEXITCODE -ne 0) {
  throw "Failed to query platform-api status on port $Port."
}

$status = $statusRaw | ConvertFrom-Json
if ($status.result -eq "ok") {
  Write-Output "platform-api already healthy on port $Port."
  exit 0
}

Write-Output "platform-api unavailable on port $Port. Recovering approved dev bootstrap..."
& $controlScriptPath -Action recover -Port $Port
exit $LASTEXITCODE
