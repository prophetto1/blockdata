[CmdletBinding()]
param(
    [switch]$Start,
    [switch]$Reset,
    [switch]$Status,
    [switch]$Stop
)

$ErrorActionPreference = "Stop"
function Write-Section([string]$Message) {
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Fail([string]$Message) {
    Write-Error $Message
    exit 1
}

function Ensure-Command([string]$CommandName, [string]$InstallHint) {
    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        Fail "$CommandName is not available. $InstallHint"
    }
}

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FriendlyName,
        [Parameter(Mandatory = $true)]
        [string]$CommandLine
    )

    $output = & cmd.exe /d /c "$CommandLine 2>&1"
    $exitCode = $LASTEXITCODE

    if ($output) {
        $output | ForEach-Object { Write-Host $_ }
    }

    return @{
        Output = @($output)
        ExitCode = $exitCode
        Success = ($exitCode -eq 0)
    }
}

function Test-DockerReady {
    $result = Invoke-CheckedCommand -FriendlyName "docker info" -CommandLine 'docker info --format "{{.ServerVersion}}"'
    if (-not $result.Success) {
        Fail "Docker is not reachable from this shell. Start Docker Desktop and retry."
    }
}

function Get-SupabaseStatus {
    return Invoke-CheckedCommand -FriendlyName "supabase status" -CommandLine 'npx supabase status'
}

function Start-SupabaseStack {
    Write-Section "Starting local Supabase stack"
    $result = Invoke-CheckedCommand -FriendlyName "supabase start" -CommandLine 'npx supabase start'

    if (-not $result.Success) {
        $joined = ($result.Output -join "`n")
        if ($joined -match "Rate exceeded") {
            Fail "Supabase image pull was rate-limited by Docker Hub. Run 'docker login' and retry this script."
        }

        Fail "Local Supabase stack failed to start. Review the output above."
    }
}

function Reset-SupabaseDatabase {
    Write-Section "Resetting local Supabase database"
    $result = Invoke-CheckedCommand -FriendlyName "supabase db reset" -CommandLine 'npx supabase db reset'
    if (-not $result.Success) {
        Fail "Local Supabase database reset failed. Review the output above."
    }
}

function Stop-SupabaseStack {
    Write-Section "Stopping local Supabase stack"
    $result = Invoke-CheckedCommand -FriendlyName "supabase stop" -CommandLine 'npx supabase stop'
    if (-not $result.Success) {
        Fail "Local Supabase stack failed to stop cleanly. Review the output above."
    }
}

Ensure-Command -CommandName "npx" -InstallHint "Install Node.js and npm so the Supabase CLI can run through npx."
Ensure-Command -CommandName "docker" -InstallHint "Install Docker Desktop and make sure it is running."

if (-not ($Start -or $Reset -or $Status -or $Stop)) {
    $Start = $true
}

Test-DockerReady

if ($Stop) {
    Stop-SupabaseStack
    exit 0
}

$statusResult = Get-SupabaseStatus
$stackRunning = $statusResult.Success

if ($Status) {
    if (-not $stackRunning) {
        Write-Host "Local Supabase stack is not running." -ForegroundColor Yellow
        exit 1
    }

    Write-Host "Local Supabase stack is running." -ForegroundColor Green
    exit 0
}

if (-not $stackRunning) {
    Start-SupabaseStack
    $statusResult = Get-SupabaseStatus
    if (-not $statusResult.Success) {
        Fail "Supabase start returned, but the stack still does not report healthy status."
    }
}

Write-Host "Local Supabase stack is running." -ForegroundColor Green

if ($Reset) {
    Reset-SupabaseDatabase
    Write-Host "Local Supabase database reset completed." -ForegroundColor Green
}
