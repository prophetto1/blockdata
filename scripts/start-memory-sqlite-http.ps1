$ErrorActionPreference = "Stop"

$env:MCP_MEMORY_STORAGE_BACKEND = "sqlite_vec"
$env:MCP_MEMORY_SQLITE_PATH = "E:\writing-system\_memory\cc\mcp-memory.db"
$env:MCP_MEMORY_BACKUPS_PATH = "E:\writing-system\_memory\cc\backups"

$existing = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "memory.exe" -and
    $_.CommandLine -match "--streamable-http" -and
    $_.CommandLine -match "8765"
  }

if ($existing) {
  $existing | Select-Object ProcessId, CommandLine
  exit 0
}

$proc = Start-Process `
  -FilePath "memory.exe" `
  -ArgumentList "server", "--streamable-http", "--sse-host", "127.0.0.1", "--sse-port", "8765" `
  -WindowStyle Hidden `
  -PassThru

Start-Sleep -Seconds 2

$proc | Select-Object Id, ProcessName
