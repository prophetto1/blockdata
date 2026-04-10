[CmdletBinding()]
param(
  [string]$ServiceName = 'nats-server'
)

$ErrorActionPreference = 'Stop'

$service = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'" -ErrorAction SilentlyContinue
if (-not $service) {
  Write-Output (@{
    ServiceName = $ServiceName
    Removed = $false
    Reason = 'not_installed'
  } | ConvertTo-Json)
  return
}

if ($service.State -eq 'Running') {
  Stop-Service -Name $ServiceName
}

& sc.exe delete $ServiceName | Out-Null

Write-Output (@{
  ServiceName = $ServiceName
  Removed = $true
} | ConvertTo-Json)
