param(
    [string]$FilePath,
    [string]$DocTitle = "Non-MD Test Document",
    [int]$PollIntervalSeconds = 5,
    [int]$TimeoutSeconds = 900
)

$ErrorActionPreference = "Stop"

# ============================================================================
# CONFIGURATION
# ============================================================================
# Prefer env vars so we don't commit keys into the repo.
if (-not $env:SUPABASE_URL) { $env:SUPABASE_URL = "https://dbdzzhshmigewyprahej.supabase.co" }
if (-not $env:SUPABASE_ANON_KEY) { $env:SUPABASE_ANON_KEY = "<SET_SUPABASE_ANON_KEY>" }

if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_URL.StartsWith("http")) {
    throw "SUPABASE_URL is missing or invalid. Set `$env:SUPABASE_URL = 'https://<project-ref>.supabase.co'"
}
if (-not $env:SUPABASE_ANON_KEY -or $env:SUPABASE_ANON_KEY -like "<SET_*") {
    throw "SUPABASE_ANON_KEY is missing. Set `$env:SUPABASE_ANON_KEY to your project's legacy anon (public) key (JWT-looking, starts with 'eyJ...'). Do not use the 'sb_publishable_' key."
}
if ($env:SUPABASE_ANON_KEY.Length -lt 100) {
    throw "SUPABASE_ANON_KEY looks too short. Make sure you pasted the full legacy anon key."
}

function Get-ContentTypeForFile([string]$path) {
    $lower = $path.ToLowerInvariant()
    if ($lower.EndsWith(".txt")) { return "text/plain" }
    if ($lower.EndsWith(".pdf")) { return "application/pdf" }
    if ($lower.EndsWith(".docx")) { return "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
    if ($lower.EndsWith(".md") -or $lower.EndsWith(".markdown")) { return "text/markdown" }
    return "application/octet-stream"
}

function Read-PasswordPlaintext() {
    $sec = Read-Host -AsSecureString "Test user password"
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

# ============================================================================
# STEP 1: Authenticate and get JWT
# ============================================================================
Write-Host "`n=== STEP 1: Authenticating ===" -ForegroundColor Cyan

$TEST_EMAIL = if ($env:TEST_EMAIL) { $env:TEST_EMAIL } else { Read-Host "Test user email" }
$TEST_PASSWORD = if ($env:TEST_PASSWORD) { $env:TEST_PASSWORD } else { Read-PasswordPlaintext }

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

$token = ($authResponse.access_token | ForEach-Object { $_ })
if ($token -is [string]) { $token = $token.Trim() }
if (-not $token) { throw "Auth response did not include access_token." }

Write-Host "Authenticated as: $TEST_EMAIL" -ForegroundColor Green
Write-Host "SUPABASE_URL: $env:SUPABASE_URL" -ForegroundColor Gray

# ============================================================================
# STEP 2: Choose a non-markdown file (default: .docx for Docling track)
# ============================================================================
Write-Host "`n=== STEP 2: Preparing non-markdown upload ===" -ForegroundColor Cyan

if (-not $FilePath) {
    # Default to .docx fixture to test the Docling track
    $FilePath = ".\docs\tests\test-pack\lorem_ipsum.docx"
    if (-not (Test-Path $FilePath)) {
        # Fallback to .txt if docx fixture is missing
        $FilePath = ".\\scripts\\test-non-md.txt"
        @"
Hello from the non-markdown pipeline.

This is a plain text document used to validate:
ingest -> conversion-service -> conversion-complete -> blocks -> export-jsonl
"@ | Out-File -FilePath $FilePath -Encoding UTF8
        Write-Host "Created fallback txt: $FilePath" -ForegroundColor Gray
    }
} else {
    if (-not (Test-Path $FilePath)) { throw "File not found: $FilePath" }
}

Write-Host "Using: $FilePath" -ForegroundColor Gray

$contentType = Get-ContentTypeForFile $FilePath

# Determine expected track based on file type
$ext = [System.IO.Path]::GetExtension($FilePath).ToLowerInvariant()
$expectDoclingTrack = ($ext -eq ".docx" -or $ext -eq ".pdf")

if ($expectDoclingTrack) {
    Write-Host "Expected track: docling (docling_json_pointer)" -ForegroundColor Gray
} else {
    Write-Host "Expected track: mdast fallback (text_offset_range)" -ForegroundColor Gray
}

# ============================================================================
# STEP 3: Call POST /functions/v1/ingest (v2: no immutable_schema_ref)
# ============================================================================
Write-Host "`n=== STEP 3: Calling POST /functions/v1/ingest ===" -ForegroundColor Cyan

$ingestResult = curl.exe -sS -i -X POST "$env:SUPABASE_URL/functions/v1/ingest" `
    -H "Authorization: Bearer $token" `
    -H "apikey: $env:SUPABASE_ANON_KEY" `
    -F "doc_title=$DocTitle" `
    -F "file=@$FilePath;type=$contentType"

$statusLine = (($ingestResult -split "`n")[0]).Trim()
$body = ($ingestResult -split "`r?`n`r?`n", 2)[1]
Write-Host "Ingest status line: $statusLine" -ForegroundColor Gray

$ingest = $null
try {
    $ingest = $body | ConvertFrom-Json
} catch {
    Write-Host "Failed to parse ingest response JSON." -ForegroundColor Red
    Write-Host $body -ForegroundColor Yellow
    exit 1
}

if ($ingest.error) {
    Write-Host "Ingest error: $($ingest.error)" -ForegroundColor Red
    if ($ingest.message) { Write-Host "Message: $($ingest.message)" -ForegroundColor Red }
    exit 1
}

if (-not $ingest.source_uid) {
    Write-Host "Ingest did not return source_uid." -ForegroundColor Red
    Write-Host ($ingest | ConvertTo-Json -Depth 10) -ForegroundColor Yellow
    exit 1
}

$source_uid = $ingest.source_uid
Write-Host "source_uid: $source_uid" -ForegroundColor Gray
Write-Host "initial status: $($ingest.status)" -ForegroundColor Gray

# ============================================================================
# STEP 4: Poll documents_v2 row until ingested
# ============================================================================
Write-Host "`n=== STEP 4: Polling documents_v2 status ===" -ForegroundColor Cyan

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$doc = $null

while ((Get-Date) -lt $deadline) {
    try {
        $rows = Invoke-RestMethod `
            -Method Get `
            -Uri "$env:SUPABASE_URL/rest/v1/documents_v2?source_uid=eq.$source_uid&select=source_uid,source_type,status,conv_uid,error,uploaded_at,updated_at" `
            -Headers @{
                "apikey"        = $env:SUPABASE_ANON_KEY
                "Authorization" = "Bearer $token"
            }

        if ($rows -and $rows.Count -gt 0) { $doc = $rows[0] } else { $doc = $null }
    } catch {
        Write-Host "WARN: failed to query documents_v2 via PostgREST: $_" -ForegroundColor Yellow
        $doc = $null
    }

    if ($doc) {
        Write-Host "status=$($doc.status) source_type=$($doc.source_type) conv_uid=$($doc.conv_uid)" -ForegroundColor Gray

        if ($doc.status -eq "ingested" -and $doc.conv_uid) { break }
        if ($doc.status -eq "conversion_failed" -or $doc.status -eq "ingest_failed") {
            Write-Host "FAILED: status=$($doc.status)" -ForegroundColor Red
            if ($doc.error) { Write-Host "error: $($doc.error)" -ForegroundColor Red }
            exit 1
        }
    } else {
        Write-Host "Waiting for documents_v2 row to be visible under RLS..." -ForegroundColor Gray
    }

    Start-Sleep -Seconds $PollIntervalSeconds
}

if (-not $doc -or $doc.status -ne "ingested" -or -not $doc.conv_uid) {
    Write-Host "Timed out after $TimeoutSeconds seconds waiting for ingest to complete." -ForegroundColor Red
    if ($doc) {
        Write-Host "last status=$($doc.status) conv_uid=$($doc.conv_uid)" -ForegroundColor Yellow
        if ($doc.error) { Write-Host "error: $($doc.error)" -ForegroundColor Yellow }
    }
    exit 1
}

$conv_uid = $doc.conv_uid
Write-Host "Ingest complete! conv_uid=$conv_uid" -ForegroundColor Green

# ============================================================================
# STEP 5: Export JSONL (v2 shape)
# ============================================================================
Write-Host "`n=== STEP 5: Exporting JSONL ===" -ForegroundColor Cyan

$exportFile = ".\\scripts\\export-non-md-test.jsonl"

curl.exe -sS -L "$env:SUPABASE_URL/functions/v1/export-jsonl?conv_uid=$conv_uid" `
    -H "Authorization: Bearer $token" `
    -H "apikey: $env:SUPABASE_ANON_KEY" `
    -o $exportFile

if (-not (Test-Path $exportFile)) { throw "Export did not create file: $exportFile" }

$lines = Get-Content $exportFile
if (-not $lines -or $lines.Count -lt 1) { throw "Export file is empty: $exportFile" }

Write-Host "Export successful! $($lines.Count) blocks exported" -ForegroundColor Green
Write-Host "Saved to: $exportFile" -ForegroundColor Gray

$firstBlock = $lines[0] | ConvertFrom-Json
Write-Host "`n=== First block (sample) ===" -ForegroundColor Cyan
$firstBlock | ConvertTo-Json -Depth 10

Write-Host "`n=== Verifying v2 export shape ===" -ForegroundColor Cyan
$valid = $true

if (-not $firstBlock.immutable) {
    Write-Host "MISSING: immutable" -ForegroundColor Red; $valid = $false
}
if (-not $firstBlock.immutable.source_upload.source_uid) {
    Write-Host "MISSING: immutable.source_upload.source_uid" -ForegroundColor Red; $valid = $false
}
if (-not $firstBlock.immutable.conversion.conv_uid) {
    Write-Host "MISSING: immutable.conversion.conv_uid" -ForegroundColor Red; $valid = $false
}
if (-not $firstBlock.immutable.block.block_uid) {
    Write-Host "MISSING: immutable.block.block_uid" -ForegroundColor Red; $valid = $false
}
if ($null -eq $firstBlock.user_defined) {
    Write-Host "MISSING: user_defined" -ForegroundColor Red; $valid = $false
}

# ============================================================================
# STEP 6: Verify pairing rules based on expected track
# ============================================================================
Write-Host "`n=== Verifying pairing rules ===" -ForegroundColor Cyan

$tool = $firstBlock.immutable.conversion.conv_parsing_tool
$repr = $firstBlock.immutable.conversion.conv_representation_type
$locType = $firstBlock.immutable.block.block_locator.type

Write-Host "conv_parsing_tool: $tool" -ForegroundColor Gray
Write-Host "conv_representation_type: $repr" -ForegroundColor Gray
Write-Host "block_locator.type: $locType" -ForegroundColor Gray

if ($expectDoclingTrack) {
    # Hard assertions for Docling track
    if ($tool -ne "docling") {
        Write-Host "FAIL: conv_parsing_tool expected 'docling', got '$tool'" -ForegroundColor Red; $valid = $false
    }
    if ($repr -ne "doclingdocument_json") {
        Write-Host "FAIL: conv_representation_type expected 'doclingdocument_json', got '$repr'" -ForegroundColor Red; $valid = $false
    }
    if ($locType -ne "docling_json_pointer") {
        Write-Host "FAIL: block_locator.type expected 'docling_json_pointer', got '$locType'" -ForegroundColor Red; $valid = $false
    }
    # Verify pointer field exists
    if (-not $firstBlock.immutable.block.block_locator.pointer) {
        Write-Host "FAIL: block_locator.pointer is missing" -ForegroundColor Red; $valid = $false
    } else {
        Write-Host "block_locator.pointer: $($firstBlock.immutable.block.block_locator.pointer)" -ForegroundColor Gray
    }
} else {
    # Assertions for mdast fallback track (txt)
    if ($tool -ne "mdast") {
        Write-Host "FAIL: conv_parsing_tool expected 'mdast', got '$tool'" -ForegroundColor Red; $valid = $false
    }
    if ($repr -ne "markdown_bytes") {
        Write-Host "FAIL: conv_representation_type expected 'markdown_bytes', got '$repr'" -ForegroundColor Red; $valid = $false
    }
    if ($locType -ne "text_offset_range") {
        Write-Host "FAIL: block_locator.type expected 'text_offset_range', got '$locType'" -ForegroundColor Red; $valid = $false
    }
}

if ($valid) {
    Write-Host "v2 export shape + pairing rules OK." -ForegroundColor Green
} else {
    throw "v2 export shape or pairing rule validation failed."
}

Write-Host "`n=== SMOKE TEST COMPLETE ===" -ForegroundColor Green
