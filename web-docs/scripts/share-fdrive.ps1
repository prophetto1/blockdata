$ErrorActionPreference = 'Stop'

$logPath = 'F:\blockdata-ct\scripts\share-fdrive.log'
Start-Transcript -Path $logPath -Force | Out-Null

try {
    $shareName = 'FDrive'
    $sharePath = 'F:\'

    $existing = Get-SmbShare -Name $shareName -ErrorAction SilentlyContinue
    if (-not $existing) {
        New-SmbShare -Name $shareName -Path $sharePath -ChangeAccess 'Everyone' -CachingMode None | Out-Null
    }

    Set-NetFirewallRule -DisplayGroup 'File and Printer Sharing' -Profile Private -Enabled True | Out-Null

    Write-Host '=== Host ==='
    hostname

    Write-Host '=== Logged In User ==='
    (Get-CimInstance Win32_ComputerSystem).UserName

    Write-Host '=== IPv4 ==='
    Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' } |
        Select-Object InterfaceAlias, IPAddress, PrefixLength |
        Format-Table -AutoSize

    Write-Host '=== Share ==='
    Get-SmbShare -Name $shareName |
        Select-Object Name, Path, Description, CurrentUsers |
        Format-Table -AutoSize

    Write-Host '=== Share Access ==='
    Get-SmbShareAccess -Name $shareName |
        Select-Object Name, AccountName, AccessControlType, AccessRight |
        Format-Table -AutoSize

    Write-Host '=== F ACL ==='
    icacls $sharePath
}
finally {
    Stop-Transcript | Out-Null
}
