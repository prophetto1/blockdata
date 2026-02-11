# Temporary wrapper: load .env and run smoke test with PDF fixture
$envFile = Join-Path $PSScriptRoot "..\\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([A-Z_]+)=(.+)$' -and $_ -notmatch '^\s*#') {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
        }
    }
}

& "$PSScriptRoot\smoke-test-non-md.ps1" `
    -FilePath "$PSScriptRoot\..\docs\tests\test-pack\lorem_ipsum.pdf" `
    -DocTitle "PDF Smoke Test" `
    -TimeoutSeconds 300