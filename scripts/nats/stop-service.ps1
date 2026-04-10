[CmdletBinding()]
param(
  [string]$ServiceName = 'nats-server'
)

$ErrorActionPreference = 'Stop'

$service = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'" -ErrorAction SilentlyContinue
if (-not $service) {
  throw "Service '$ServiceName' is not installed."
}

if ($service.State -eq 'Running') {
  Stop-Service -Name $ServiceName
}

$updatedService = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'" -ErrorAction Stop
[pscustomobject]@{
  ServiceName = $ServiceName
  State = $updatedService.State
  StartMode = $updatedService.StartMode
} | ConvertTo-Json -Depth 4
