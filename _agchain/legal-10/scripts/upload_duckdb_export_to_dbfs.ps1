[CmdletBinding()]
param(
  [Parameter()]
  [string]$SourceDir = "E:\agchain\legal-10\datasets\parquet\2026-02-05_095022_duckdb_export",

  [Parameter()]
  [string]$DbfsTarget = "dbfs:/FileStore/legal10_parquet/2026-02-05_095022_duckdb_export",

  [Parameter()]
  [string]$WorkspaceHost,

  [Parameter()]
  [switch]$Overwrite
)

$ErrorActionPreference = "Stop"

function Get-PythonScriptsDir {
  $pythonExe = (py -c "import sys; print(sys.executable)" 2>$null)
  if (-not $pythonExe) {
    throw "Python launcher 'py' not found. Install Python or run this from a Python-enabled PowerShell."
  }
  $pythonExe = $pythonExe.Trim()
  return (Join-Path (Split-Path $pythonExe -Parent) "Scripts")
}

function Get-DatabricksExe {
  $cmd = Get-Command databricks -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $scriptsDir = Get-PythonScriptsDir
  $candidate = Join-Path $scriptsDir "databricks.exe"
  if (Test-Path -LiteralPath $candidate) {
    return $candidate
  }

  return $null
}

function Ensure-DatabricksCli {
  $exe = Get-DatabricksExe
  if ($exe) {
    return $exe
  }

  Write-Host "Installing legacy Databricks CLI (databricks-cli)..." -ForegroundColor Cyan
  py -m pip install --upgrade databricks-cli | Out-Host

  $exe = Get-DatabricksExe
  if (-not $exe) {
    $scriptsDir = Get-PythonScriptsDir
    throw "Installed databricks-cli but 'databricks.exe' still not found. Ensure '$scriptsDir' is on PATH."
  }

  return $exe
}

function Read-SecretPlaintext([string]$Prompt) {
  $secure = Read-Host -AsSecureString $Prompt
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

if (-not (Test-Path -LiteralPath $SourceDir)) {
  throw "SourceDir not found: $SourceDir"
}

$databricksExe = Ensure-DatabricksCli
Write-Host "Using Databricks CLI: $databricksExe" -ForegroundColor DarkGray
& $databricksExe --version | Out-Host

if (-not $WorkspaceHost) {
  $WorkspaceHost = $env:DATABRICKS_HOST
}
if (-not $WorkspaceHost) {
  $WorkspaceHost = Read-Host "Databricks host (e.g. https://<your-workspace>.cloud.databricks.com)"
}

if (-not $env:DATABRICKS_TOKEN) {
  $env:DATABRICKS_TOKEN = Read-SecretPlaintext "Databricks token (input hidden)"
}
$env:DATABRICKS_HOST = $WorkspaceHost

$DbfsTarget = $DbfsTarget.TrimEnd("/")
if (-not ($DbfsTarget -like "dbfs:*")) {
  throw "DbfsTarget must start with 'dbfs:'. Got: $DbfsTarget"
}

$sourceForCli = $SourceDir
if ($sourceForCli -match "^[A-Za-z]:\\") {
  $sourceForCli = ($sourceForCli -replace "\\", "/")
}

Write-Host "Sanity check: databricks fs ls dbfs:/" -ForegroundColor Cyan
& $databricksExe fs ls "dbfs:/" | Out-Host

Write-Host "Creating destination folder: $DbfsTarget" -ForegroundColor Cyan
& $databricksExe fs mkdirs $DbfsTarget | Out-Host

Write-Host "Uploading (recursive)..." -ForegroundColor Cyan
$cpArgs = @("fs", "cp", "-r", $sourceForCli, $DbfsTarget)
if ($Overwrite) {
  $cpArgs = @("fs", "cp", "--overwrite", "-r", $sourceForCli, $DbfsTarget)
}
& $databricksExe @cpArgs | Out-Host

Write-Host "Verify destination listing:" -ForegroundColor Cyan
& $databricksExe fs ls $DbfsTarget | Out-Host

Write-Host "Verify tables/ (first 10):" -ForegroundColor Cyan
(& $databricksExe fs ls "$DbfsTarget/tables") | Select-Object -First 10 | Out-Host

Write-Host "Verify views/ (first 10):" -ForegroundColor Cyan
(& $databricksExe fs ls "$DbfsTarget/views") | Select-Object -First 10 | Out-Host
