[CmdletBinding()]
param(
  [string]$ServiceName = 'nats-server',
  [string]$HostName = '127.0.0.1',
  [int]$ClientPort = 4222,
  [int]$MonitorPort = 8222
)

$ErrorActionPreference = 'Stop'

$service = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'" -ErrorAction SilentlyContinue
if (-not $service) {
  throw "Service '$ServiceName' is not installed."
}

$clientPortOpen = Test-NetConnection -ComputerName $HostName -Port $ClientPort -InformationLevel Quiet -WarningAction SilentlyContinue
$monitorPortOpen = Test-NetConnection -ComputerName $HostName -Port $MonitorPort -InformationLevel Quiet -WarningAction SilentlyContinue

if ($service.State -ne 'Running' -or -not $clientPortOpen -or -not $monitorPortOpen) {
  throw "Broker smoke verification failed. State=$($service.State) client_port_open=$clientPortOpen monitor_port_open=$monitorPortOpen"
}

[pscustomobject]@{
  ServiceName = $ServiceName
  State = $service.State
  ClientPort = $ClientPort
  ClientPortOpen = $clientPortOpen
  MonitorPort = $MonitorPort
  MonitorPortOpen = $monitorPortOpen
} | ConvertTo-Json -Depth 4
