# Smoke Test Script for Block Inventory Pipeline
# Run from project root: .\scripts\smoke-test.ps1

$ErrorActionPreference = "Stop"

# ============================================================================
# CONFIGURATION - Fill these in
# ============================================================================
# Prefer env vars so we don't commit keys into the repo.
if (-not $env:SUPABASE_URL) { $env:SUPABASE_URL = "https://dbdzzhshmigewyprahej.supabase.co" }
if (-not $env:SUPABASE_ANON_KEY) { $env:SUPABASE_ANON_KEY = "<SET_SUPABASE_ANON_KEY>" }

# Validate env/config early to avoid confusing downstream errors.
if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_URL.StartsWith("http")) {
    throw "SUPABASE_URL is missing or invalid. Set `$env:SUPABASE_URL = 'https://<project-ref>.supabase.co'"
}
if (-not $env:SUPABASE_ANON_KEY -or $env:SUPABASE_ANON_KEY -like "<SET_*") {
    throw "SUPABASE_ANON_KEY is missing. Set `$env:SUPABASE_ANON_KEY to your project's legacy anon (public) key (JWT-looking, starts with 'eyJ...'). Do not use the 'sb_publishable_' key."
}
if ($env:SUPABASE_ANON_KEY.Length -lt 100) {
    throw "SUPABASE_ANON_KEY looks too short. Make sure you pasted the full legacy anon key."
}

# Test user credentials (do NOT hardcode secrets in this repo).
$TEST_EMAIL = if ($env:TEST_EMAIL) { $env:TEST_EMAIL } else { Read-Host "Test user email" }

if ($env:TEST_PASSWORD) {
    $TEST_PASSWORD = $env:TEST_PASSWORD
} else {
    $sec = Read-Host -AsSecureString "Test user password"
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    try {
        $TEST_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

# ============================================================================
# STEP 1: Authenticate and get JWT
# ============================================================================
Write-Host "`n=== STEP 1: Authenticating ===" -ForegroundColor Cyan

try {
    $authResponse = Invoke-RestMethod `
        -Method Post `
        -Uri "$env:SUPABASE_URL/auth/v1/token?grant_type=password" `
        -Headers @{
        "apikey"       = $env:SUPABASE_ANON_KEY
        "Content-Type" = "application/json"
    } `
        -Body (@{
            email    = $TEST_EMAIL
            password = $TEST_PASSWORD
        } | ConvertTo-Json)

    $token = ($authResponse.access_token | ForEach-Object { $_ }) # normalize
    if ($token -is [string]) { $token = $token.Trim() }
    if (-not $token) {
        Write-Host "Auth response did not include access_token." -ForegroundColor Red
        Write-Host ($authResponse | ConvertTo-Json -Depth 10) -ForegroundColor Yellow
        exit 1
    }

    Write-Host "Authenticated as: $TEST_EMAIL" -ForegroundColor Green
    Write-Host "User ID: $($authResponse.user.id)" -ForegroundColor Gray
    Write-Host "JWT length: $($token.Length)" -ForegroundColor Gray
    Write-Host "SUPABASE_URL: $env:SUPABASE_URL" -ForegroundColor Gray

    function Decode-JwtPayload([string]$jwt) {
        $parts = $jwt.Split('.')
        if ($parts.Length -lt 2) { return $null }
        $payload = $parts[1].Replace('-', '+').Replace('_', '/')
        switch ($payload.Length % 4) {
            2 { $payload += "==" }
            3 { $payload += "=" }
        }
        try {
            return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload))
        }
        catch { return $null }
    }

    $payloadText = Decode-JwtPayload $token
    if ($payloadText) {
        $payload = $payloadText | ConvertFrom-Json
        Write-Host "JWT payload: ref=$($payload.ref) role=$($payload.role) iss=$($payload.iss) exp=$($payload.exp)" -ForegroundColor Gray
    } else {
        Write-Host "WARN: Could not decode JWT payload for diagnostics." -ForegroundColor Yellow
    }

    # Sanity-check the JWT against Supabase Auth.
    $me = Invoke-RestMethod `
        -Method Get `
        -Uri "$env:SUPABASE_URL/auth/v1/user" `
        -Headers @{
            "apikey"        = $env:SUPABASE_ANON_KEY
            "Authorization" = "Bearer $token"
        }
    Write-Host "JWT verified by /auth/v1/user (email: $($me.email))" -ForegroundColor Green

    # Sanity-check the JWT against the Functions gateway (should return 405, not 401).
    Write-Host "Probing Functions JWT validation..." -ForegroundColor Gray
    $probe = curl.exe -sS -i -X GET "$env:SUPABASE_URL/functions/v1/ingest" `
        -H "Authorization: Bearer $token" `
        -H "apikey: $env:SUPABASE_ANON_KEY"
    $probeFirstLine = (($probe -split "`n")[0]).Trim()
    Write-Host "Functions probe status line: $probeFirstLine" -ForegroundColor Gray
}
catch {
    Write-Host "Authentication failed: $_" -ForegroundColor Red
    Write-Host "`nTo create a test user:" -ForegroundColor Yellow
    Write-Host "1. Go to Supabase Dashboard > Authentication > Users"
    Write-Host "2. Click 'Add user' > 'Create new user'"
    Write-Host "3. Enter email: $TEST_EMAIL"
    Write-Host "4. Enter password: $TEST_PASSWORD"
    Write-Host "5. Check 'Auto Confirm User'"
    Write-Host "6. Click 'Create user'"
    exit 1
}

# ============================================================================
# STEP 2: Upload a test .md file to /ingest
# ============================================================================
Write-Host "`n=== STEP 2: Uploading test document ===" -ForegroundColor Cyan

# Choose an existing markdown doc (default: PRD) or generate a small test doc.
$testFile = ".\json-schemas\prd-v4.md"
if (-not (Test-Path $testFile)) {
    $testMd = @"
# Test Document

This is the first paragraph of the test document. It contains enough text to verify that block splitting works correctly.

## Section One

Here is another paragraph under section one. The section_path should reflect this heading hierarchy.

### Subsection A

A paragraph in a deeper subsection. This tests nested heading tracking.

## Section Two

Final paragraph in section two. This should be the last block.
"@

    $testFile = ".\scripts\test-document.md"
    $testMd | Out-File -FilePath $testFile -Encoding UTF8
    Write-Host "Created test file: $testFile" -ForegroundColor Gray
}
else {
    Write-Host "Using markdown file: $testFile" -ForegroundColor Gray
}

# Use curl for multipart form upload (PowerShell's Invoke-RestMethod is awkward with multipart)
Write-Host "Calling POST /functions/v1/ingest..." -ForegroundColor Gray

$ingestResult = curl.exe -sS -X POST "$env:SUPABASE_URL/functions/v1/ingest" `
    -H "Authorization: Bearer $token" `
    -H "apikey: $env:SUPABASE_ANON_KEY" `
    -F "immutable_schema_ref=md_prose_v1" `
    -F "doc_title=Test Document" `
    -F "file=@$testFile;type=text/markdown"

Write-Host "Raw response: $ingestResult" -ForegroundColor Gray

try {
    $ingest = $ingestResult | ConvertFrom-Json

    if ($ingest.error) {
        Write-Host "Ingest error: $($ingest.error)" -ForegroundColor Red
        if ($ingest.message) { Write-Host "Message: $($ingest.message)" -ForegroundColor Red }
        exit 1
    }

    if (-not $ingest.doc_uid) {
        Write-Host "Ingest did not return doc_uid (expected for .md uploads)" -ForegroundColor Red
        exit 1
    }

    Write-Host "Ingest successful!" -ForegroundColor Green
    Write-Host "  source_uid: $($ingest.source_uid)" -ForegroundColor Gray
    Write-Host "  doc_uid: $($ingest.doc_uid)" -ForegroundColor Gray
    Write-Host "  status: $($ingest.status)" -ForegroundColor Gray
    Write-Host "  blocks_count: $($ingest.blocks_count)" -ForegroundColor Gray

    $doc_uid = $ingest.doc_uid
}
catch {
    Write-Host "Failed to parse ingest response: $_" -ForegroundColor Red
    Write-Host "Raw response was: $ingestResult" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# STEP 3: Export JSONL and verify shape
# ============================================================================
Write-Host "`n=== STEP 3: Exporting JSONL ===" -ForegroundColor Cyan

$exportFile = ".\scripts\export-test.jsonl"

curl.exe -sS -L "$env:SUPABASE_URL/functions/v1/export-jsonl?doc_uid=$doc_uid" `
    -H "Authorization: Bearer $token" `
    -H "apikey: $env:SUPABASE_ANON_KEY" `
    -o $exportFile

if (Test-Path $exportFile) {
    $lines = Get-Content $exportFile
    $lineCount = $lines.Count

    Write-Host "Export successful! $lineCount blocks exported" -ForegroundColor Green
    Write-Host "Saved to: $exportFile" -ForegroundColor Gray

    Write-Host "`n=== First block (sample) ===" -ForegroundColor Cyan
    $firstBlock = $lines[0] | ConvertFrom-Json
    $firstBlock | ConvertTo-Json -Depth 10

    # Verify PRD contract
    Write-Host "`n=== Verifying PRD contract ===" -ForegroundColor Cyan
    $valid = $true

    if (-not $firstBlock.immutable) {
        Write-Host "MISSING: immutable" -ForegroundColor Red
        $valid = $false
    }
    if (-not $firstBlock.immutable.immutable_schema_ref) {
        Write-Host "MISSING: immutable.immutable_schema_ref" -ForegroundColor Red
        $valid = $false
    }
    if (-not $firstBlock.immutable.envelope) {
        Write-Host "MISSING: immutable.envelope" -ForegroundColor Red
        $valid = $false
    }
    if (-not $firstBlock.immutable.envelope.doc_uid) {
        Write-Host "MISSING: immutable.envelope.doc_uid" -ForegroundColor Red
        $valid = $false
    }
    if (-not $firstBlock.immutable.envelope.block_uid) {
        Write-Host "MISSING: immutable.envelope.block_uid" -ForegroundColor Red
        $valid = $false
    }
    if (-not $firstBlock.immutable.content) {
        Write-Host "MISSING: immutable.content" -ForegroundColor Red
        $valid = $false
    }
    if ($null -eq $firstBlock.annotation) {
        Write-Host "MISSING: annotation" -ForegroundColor Red
        $valid = $false
    }

    # Phase 1: annotation should be inert placeholder
    if ($firstBlock.annotation.schema_ref -ne $null -and $firstBlock.annotation.schema_ref -ne "") {
        Write-Host "WARN: annotation.schema_ref should be null in Phase 1" -ForegroundColor Yellow
    }

    if ($valid) {
        Write-Host "All required fields present!" -ForegroundColor Green
    }
}
else {
    Write-Host "Export failed - no file created" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 4: Query database directly to verify
# ============================================================================
Write-Host "`n=== STEP 4: Verifying database state ===" -ForegroundColor Cyan
Write-Host "(Check Supabase Dashboard > Table Editor > documents and blocks)" -ForegroundColor Gray

Write-Host "`n=== SMOKE TEST COMPLETE ===" -ForegroundColor Green
Write-Host "doc_uid: $doc_uid" -ForegroundColor Cyan
