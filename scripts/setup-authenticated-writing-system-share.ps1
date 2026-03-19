[CmdletBinding()]
param(
    [string]$ShareName = "writing-system",
    [string]$SharePath = "E:\writing-system",
    [string]$AccountName = "smbuser",
    [string]$SecretPath = "E:\writing-system\.deploy-secrets\writing-system-smb.txt",
    [string]$Password,
    [switch]$SkipSelfTest
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function New-SafePassword {
    $chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    return -join ((1..24) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
}

if (-not (Test-IsAdministrator)) {
    throw "Run this script from an elevated PowerShell session."
}

if (-not (Test-Path -LiteralPath $SharePath)) {
    throw "Share path not found: $SharePath"
}

$share = Get-SmbShare -Name $ShareName -ErrorAction Stop
if ($share.Path -ne $SharePath) {
    throw "Share '$ShareName' points to '$($share.Path)', expected '$SharePath'."
}

if ([string]::IsNullOrWhiteSpace($Password)) {
    $Password = New-SafePassword
}

$securePassword = ConvertTo-SecureString $Password -AsPlainText -Force
$accountFullName = "$env:COMPUTERNAME\$AccountName"
$secretDir = Split-Path -Parent $SecretPath

if (-not (Test-Path -LiteralPath $secretDir)) {
    New-Item -ItemType Directory -Path $secretDir -Force | Out-Null
}

$existingUser = Get-LocalUser -Name $AccountName -ErrorAction SilentlyContinue
if ($null -eq $existingUser) {
    New-LocalUser `
        -Name $AccountName `
        -Password $securePassword `
        -FullName "SMB Share User" `
        -Description "Authenticated SMB access for $ShareName" | Out-Null
} else {
    if (-not $existingUser.Enabled) {
        Enable-LocalUser -Name $AccountName
    }
    Set-LocalUser `
        -Name $AccountName `
        -Password $securePassword `
        -Description "Authenticated SMB access for $ShareName"
}

cmd.exe /c "net user $AccountName /passwordreq:yes" | Out-Null

$adsiUser = [ADSI]"WinNT://$env:COMPUTERNAME/$AccountName,user"
$userFlags = [int]$adsiUser.UserFlags.Value
$adsiUser.Put("UserFlags", ($userFlags -bor 0x10000) -band (-bnot 0x20))
$adsiUser.SetInfo()

Set-ItemProperty `
    -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" `
    -Name "forceguest" `
    -Value 0

$shareRule = Get-SmbShareAccess -Name $ShareName | Where-Object {
    $_.AccountName -ieq $accountFullName
}

if ($null -eq $shareRule) {
    Grant-SmbShareAccess `
        -Name $ShareName `
        -AccountName $accountFullName `
        -AccessRight Change `
        -Force | Out-Null
} elseif ($shareRule.AccessControlType -ne "Allow" -or $shareRule.AccessRight -ne "Change") {
    Revoke-SmbShareAccess `
        -Name $ShareName `
        -AccountName $accountFullName `
        -Force | Out-Null
    Grant-SmbShareAccess `
        -Name $ShareName `
        -AccountName $accountFullName `
        -AccessRight Change `
        -Force | Out-Null
}

cmd.exe /c "icacls ""$SharePath"" /grant ""${accountFullName}:(OI)(CI)(M)""" | Out-Null

Set-Content `
    -Path $SecretPath `
    -Encoding Ascii `
    -Value @(
        "share=//$($env:COMPUTERNAME)/$ShareName"
        "username=$AccountName"
        "password=$Password"
        "mount_command=sudo mount -t cifs //$($env:COMPUTERNAME)/$ShareName /mnt/writing-system -o credentials=/root/.smb-writing-system,vers=3.0,uid=`$(id -u),gid=`$(id -g)"
    )

try {
    cmd.exe /c "icacls ""$SecretPath"" /inheritance:r /grant:r ""$env:USERNAME:(R,W)"" ""Administrators:(F)""" | Out-Null
} catch {
    Write-Warning "Couldn't tighten permissions on ${SecretPath}: $($_.Exception.Message)"
}

$serverConfig = Get-SmbServerConfiguration | Select-Object RequireSecuritySignature, EnableSecuritySignature
$shareAccess = Get-SmbShareAccess -Name $ShareName | Select-Object AccountName, AccessControlType, AccessRight
$netUseTarget = "\\127.0.0.1\$ShareName"
$sampleListing = @()

if (-not $SkipSelfTest) {
    cmd.exe /c "net use $netUseTarget /delete /y" *> $null
    cmd.exe /c "net use $netUseTarget $Password /user:$accountFullName /persistent:no" | Out-Null
    try {
        $sampleListing = Get-ChildItem -LiteralPath $netUseTarget | Select-Object -First 5 Name, Mode, Length
    } finally {
        cmd.exe /c "net use $netUseTarget /delete /y" | Out-Null
    }
}

[PSCustomObject]@{
    ShareName                 = $ShareName
    SharePath                 = $SharePath
    AccountName               = $accountFullName
    SecretPath                = $SecretPath
    RequireSecuritySignature  = $serverConfig.RequireSecuritySignature
    EnableSecuritySignature   = $serverConfig.EnableSecuritySignature
    SampleListing             = $sampleListing
    UbuntuMountCommand        = "sudo mount -t cifs //$($env:COMPUTERNAME)/$ShareName /mnt/writing-system -o credentials=/root/.smb-writing-system,vers=3.0,uid=`$(id -u),gid=`$(id -g)"
} | Format-List
