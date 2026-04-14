param(
  [string]$RepoRoot = $env:REPO_ROOT,
  [int]$Port = 8765,
  [int]$StartupTimeoutSeconds = 120
)

$ErrorActionPreference = "Stop"

function Test-TcpPort {
  param(
    [string]$Address = "127.0.0.1",
    [int]$Port
  )

  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $async = $client.BeginConnect($Address, $Port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(500)) {
      return $false
    }

    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = Split-Path -Parent $PSScriptRoot
}

$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
$memoryRoot = Join-Path $RepoRoot "_memory"
$sqlitePath = Join-Path $memoryRoot "mcp-memory.db"
$backupsPath = Join-Path $memoryRoot "backups"
$logsRoot = Join-Path $memoryRoot "logs"
$hfHome = Join-Path $memoryRoot "hf-home"
$torchHome = Join-Path $memoryRoot "torch-home"
$sentenceTransformersHome = Join-Path $memoryRoot "sentence-transformers"
$stdoutLogPath = Join-Path $logsRoot "memory-sqlite-http.stdout.log"
$stderrLogPath = Join-Path $logsRoot "memory-sqlite-http.stderr.log"

New-Item -ItemType Directory -Force -Path $memoryRoot | Out-Null
New-Item -ItemType Directory -Force -Path $backupsPath | Out-Null
New-Item -ItemType Directory -Force -Path $logsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $hfHome | Out-Null
New-Item -ItemType Directory -Force -Path $torchHome | Out-Null
New-Item -ItemType Directory -Force -Path $sentenceTransformersHome | Out-Null

$env:MCP_MEMORY_STORAGE_BACKEND = "sqlite_vec"
$env:MCP_MEMORY_SQLITE_PATH = $sqlitePath
$env:MCP_MEMORY_BACKUPS_PATH = $backupsPath
$env:HF_HOME = $hfHome
$env:TORCH_HOME = $torchHome
$env:SENTENCE_TRANSFORMERS_HOME = $sentenceTransformersHome

$portPattern = [regex]::Escape([string]$Port)
$existing = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "memory.exe" -and
    $_.CommandLine -match "--streamable-http" -and
    $_.CommandLine -match $portPattern
  }

if ($existing -and (Test-TcpPort -Port $Port)) {
  $existing | Select-Object `
    @{Name = "ProcessId"; Expression = { $_.ProcessId } },
    CommandLine,
    @{Name = "RepoRoot"; Expression = { $RepoRoot } },
    @{Name = "SQLitePath"; Expression = { $sqlitePath } },
    @{Name = "BackupsPath"; Expression = { $backupsPath } },
    @{Name = "Port"; Expression = { $Port } }
  exit 0
}

if ($existing) {
  $existing | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
}

$proc = Start-Process `
  -FilePath "memory.exe" `
  -ArgumentList "server", "--streamable-http", "--sse-host", "127.0.0.1", "--sse-port", $Port.ToString() `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLogPath `
  -RedirectStandardError $stderrLogPath `
  -PassThru

$deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
do {
  Start-Sleep -Milliseconds 250
  if (Test-TcpPort -Port $Port) {
    [PSCustomObject]@{
      ProcessId = $proc.Id
      ProcessName = $proc.ProcessName
      RepoRoot = $RepoRoot
      SQLitePath = $sqlitePath
      BackupsPath = $backupsPath
      Port = $Port
      StdoutLogPath = $stdoutLogPath
      StderrLogPath = $stderrLogPath
    }
    exit 0
  }
} while ((Get-Date) -lt $deadline)

if (-not $proc.HasExited) {
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}

throw "memory-sqlite HTTP server failed to bind 127.0.0.1:$Port within $StartupTimeoutSeconds seconds. See $stderrLogPath"
