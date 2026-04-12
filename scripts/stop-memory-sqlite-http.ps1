$ErrorActionPreference = "Stop"

$existing = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "memory.exe" -and
    $_.CommandLine -match "--streamable-http" -and
    $_.CommandLine -match "8765"
  }

if (-not $existing) {
  Write-Output "No matching memory.exe streamable-http process found."
  exit 0
}

$existing | ForEach-Object {
  Stop-Process -Id $_.ProcessId -Force
  [PSCustomObject]@{
    StoppedProcessId = $_.ProcessId
  }
}
