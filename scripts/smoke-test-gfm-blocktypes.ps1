# Smoke Test: GFM block extraction (tables + footnotes) via ingest -> export-jsonl
# Run from project root: .\scripts\smoke-test-gfm-blocktypes.ps1
#
# Verifies the open-source parser pipeline produces these block types:
# - table (requires remark-gfm)
# - footnote_definition (requires remark-gfm)
# - code (fenced code blocks)
#
# This script requires a test user (email/password) and SUPABASE legacy anon key.

$ErrorActionPreference = "Stop"

# ============================================================================
# CONFIGURATION
# ============================================================================
if (-not $env:SUPABASE_URL) { $env:SUPABASE_URL = "<SET_SUPABASE_URL>" }
if (-not $env:SUPABASE_ANON_KEY) { $env:SUPABASE_ANON_KEY = "<SET_SUPABASE_ANON_KEY>" }

if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_URL.StartsWith("http")) {
    throw "SUPABASE_URL is missing or invalid. Set `$env:SUPABASE_URL = 'https://<project-ref>.supabase.co'"
}
if (-not $env:SUPABASE_ANON_KEY -or $env:SUPABASE_ANON_KEY -like "<SET_*") {
    throw "SUPABASE_ANON_KEY is missing. Set `$env:SUPABASE_ANON_KEY to your project's legacy anon (public) key (JWT-looking, starts with 'eyJ...')."
}
if ($env:SUPABASE_ANON_KEY.Length -lt 100) {
    throw "SUPABASE_ANON_KEY looks too short. Make sure you pasted the full legacy anon key."
}

$TEST_EMAIL = if ($env:TEST_EMAIL) { $env:TEST_EMAIL } else { Read-Host "Test user email" }

if ($env:TEST_PASSWORD) {
    $TEST_PASSWORD = $env:TEST_PASSWORD
} else {
    $sec = Read-Host -AsSecureString "Test user password"
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    try { $TEST_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

# ============================================================================
# STEP 1: Authenticate
# ============================================================================
Write-Host "`n=== STEP 1: Authenticating ===" -ForegroundColor Cyan

$authResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "$env:SUPABASE_URL/auth/v1/token?grant_type=password" `
    -Headers @{ apikey = $env:SUPABASE_ANON_KEY; "Content-Type" = "application/json" } `
    -Body (@{ email = $TEST_EMAIL; password = $TEST_PASSWORD } | ConvertTo-Json)

$token = ($authResponse.access_token | ForEach-Object { $_ })
if ($token -is [string]) { $token = $token.Trim() }
if (-not $token) { throw "Auth response did not include access_token." }

Write-Host "Authenticated as: $TEST_EMAIL" -ForegroundColor Green

# ============================================================================
# STEP 2: Ingest GFM smoke markdown
# ============================================================================
Write-Host "`n=== STEP 2: Ingesting GFM smoke markdown ===" -ForegroundColor Cyan

$testFile = ".\docs\test-pack\gfm-smoke.md"
if (-not (Test-Path $testFile)) { throw "Missing test markdown file: $testFile" }

Write-Host "Using markdown file: $testFile" -ForegroundColor Gray
Write-Host "Calling POST /functions/v1/ingest..." -ForegroundColor Gray

$ingestResult = curl.exe -sS -X POST "$env:SUPABASE_URL/functions/v1/ingest" `
    -H "Authorization: Bearer $token" `
    -H "apikey: $env:SUPABASE_ANON_KEY" `
    -F "immutable_schema_ref=md_prose_v1" `
    -F "doc_title=GFM Smoke" `
    -F "file=@$testFile;type=text/markdown"

$ingest = $ingestResult | ConvertFrom-Json
if ($ingest.error) { throw "Ingest error: $($ingest.error)" }
if (-not $ingest.doc_uid) { throw "Ingest did not return doc_uid (expected for .md uploads)" }

$doc_uid = $ingest.doc_uid
Write-Host "Ingested doc_uid: $doc_uid (blocks_count=$($ingest.blocks_count))" -ForegroundColor Green

# ============================================================================
# STEP 3: Export JSONL and verify block types
# ============================================================================
Write-Host "`n=== STEP 3: Exporting JSONL and verifying block types ===" -ForegroundColor Cyan

$export = curl.exe -sS -X GET "$env:SUPABASE_URL/functions/v1/export-jsonl?doc_uid=$doc_uid" `
    -H "Authorization: Bearer $token" `
    -H "apikey: $env:SUPABASE_ANON_KEY"

$lines = $export -split "`n" | Where-Object { $_.Trim() -ne "" }
if ($lines.Count -lt 1) { throw "Export returned no JSONL lines" }

$types = New-Object System.Collections.Generic.HashSet[string]
foreach ($line in $lines) {
    $obj = $line | ConvertFrom-Json
    $t = $obj.immutable.envelope.block_type
    if ($t) { [void]$types.Add([string]$t) }
}

$required = @("heading", "paragraph", "code", "table", "footnote_definition")
$missing = @()
foreach ($r in $required) {
    if (-not $types.Contains($r)) { $missing += $r }
}

Write-Host "Observed block types: $([string]::Join(', ', ($types | Sort-Object)))" -ForegroundColor Gray

if ($missing.Count -gt 0) {
    throw "Missing required block types: $([string]::Join(', ', $missing)). If table/footnote_definition are missing, ensure remark-gfm is enabled in the markdown parser and Edge Functions are redeployed."
}

Write-Host "GFM block-type smoke test PASSED." -ForegroundColor Green

