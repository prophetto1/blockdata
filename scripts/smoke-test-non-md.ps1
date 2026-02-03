param(
    [string]$FilePath,
    [string]$ImmutableSchemaRef = "md_prose_v1",
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
# STEP 2: Choose / create a non-markdown file
# ============================================================================
Write-Host "`n=== STEP 2: Preparing non-markdown upload ===" -ForegroundColor Cyan

if (-not $FilePath) {
    $FilePath = ".\\scripts\\test-non-md.txt"
    @"
Hello from the non-markdown pipeline.

This is a plain text document used to validate:
ingest -> conversion-service -> conversion-complete -> blocks -> export-jsonl
"@ | Out-File -FilePath $FilePath -Encoding UTF8
    Write-Host "Created: $FilePath" -ForegroundColor Gray
} else {
    if (-not (Test-Path $FilePath)) { throw "File not found: $FilePath" }
    Write-Host "Using: $FilePath" -ForegroundColor Gray
}

$contentType = Get-ContentTypeForFile $FilePath

# ============================================================================
# STEP 3: Call POST /functions/v1/ingest
# ============================================================================
Write-Host "`n=== STEP 3: Calling POST /functions/v1/ingest ===" -ForegroundColor Cyan

$ingestResult = curl.exe -sS -i -X POST "$env:SUPABASE_URL/functions/v1/ingest" `
    -H "Authorization: Bearer $token" `
    -H "apikey: $env:SUPABASE_ANON_KEY" `
    -F "immutable_schema_ref=$ImmutableSchemaRef" `
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
# STEP 4: Poll documents row until ingested
# ============================================================================
Write-Host "`n=== STEP 4: Polling documents status ===" -ForegroundColor Cyan

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$doc = $null

while ((Get-Date) -lt $deadline) {
    try {
        $rows = Invoke-RestMethod `
            -Method Get `
            -Uri "$env:SUPABASE_URL/rest/v1/documents?source_uid=eq.$source_uid&select=source_uid,source_type,status,doc_uid,error,uploaded_at,updated_at" `
            -Headers @{
                "apikey"        = $env:SUPABASE_ANON_KEY
                "Authorization" = "Bearer $token"
            }

        if ($rows -and $rows.Count -gt 0) { $doc = $rows[0] } else { $doc = $null }
    } catch {
        Write-Host "WARN: failed to query documents via PostgREST: $_" -ForegroundColor Yellow
        $doc = $null
    }

    if ($doc) {
        Write-Host "status=$($doc.status) source_type=$($doc.source_type) doc_uid=$($doc.doc_uid)" -ForegroundColor Gray

        if ($doc.status -eq "ingested" -and $doc.doc_uid) { break }
        if ($doc.status -eq "conversion_failed" -or $doc.status -eq "ingest_failed") {
            Write-Host "FAILED: status=$($doc.status)" -ForegroundColor Red
            if ($doc.error) { Write-Host "error: $($doc.error)" -ForegroundColor Red }
            exit 1
        }
    } else {
        Write-Host "Waiting for documents row to be visible under RLS..." -ForegroundColor Gray
    }

    Start-Sleep -Seconds $PollIntervalSeconds
}

if (-not $doc -or $doc.status -ne "ingested" -or -not $doc.doc_uid) {
    Write-Host "Timed out after $TimeoutSeconds seconds waiting for ingest to complete." -ForegroundColor Red
    if ($doc) {
        Write-Host "last status=$($doc.status) doc_uid=$($doc.doc_uid)" -ForegroundColor Yellow
        if ($doc.error) { Write-Host "error: $($doc.error)" -ForegroundColor Yellow }
    }
    exit 1
}

$doc_uid = $doc.doc_uid
Write-Host "Ingest complete! doc_uid=$doc_uid" -ForegroundColor Green

# ============================================================================
# STEP 5: Export JSONL
# ============================================================================
Write-Host "`n=== STEP 5: Exporting JSONL ===" -ForegroundColor Cyan

$exportFile = ".\\scripts\\export-non-md-test.jsonl"

curl.exe -sS -L "$env:SUPABASE_URL/functions/v1/export-jsonl?doc_uid=$doc_uid" `
    -H "Authorization: Bearer $token" `
    -H "apikey: $env:SUPABASE_ANON_KEY" `
    -o $exportFile

if (-not (Test-Path $exportFile)) { throw "Export did not create file: $exportFile" }

$lines = Get-Content $exportFile
if (-not $lines -or $lines.Count -lt 1) { throw "Export file is empty: $exportFile" }

Write-Host "Export successful! $($lines.Count) blocks exported" -ForegroundColor Green
Write-Host "Saved to: $exportFile" -ForegroundColor Gray

$firstBlock = $lines[0] | ConvertFrom-Json
if (-not $firstBlock.immutable -or -not $firstBlock.immutable.envelope -or -not $firstBlock.immutable.envelope.doc_uid) {
    Write-Host "WARN: export-jsonl first block missing expected envelope fields" -ForegroundColor Yellow
} else {
    Write-Host "Export contract looks OK (first block has immutable.envelope.doc_uid)." -ForegroundColor Green
}
