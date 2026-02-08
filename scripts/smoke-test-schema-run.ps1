# Smoke Test Script (v2): schema upload -> run creation -> export-jsonl by run_id
# Run from project root: .\scripts\smoke-test-schema-run.ps1

$ErrorActionPreference = "Stop"

# ============================================================================
# CONFIGURATION
# ============================================================================
if (-not $env:SUPABASE_URL) { $env:SUPABASE_URL = "https://dbdzzhshmigewyprahej.supabase.co" }
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
Write-Host "User ID: $($authResponse.user.id)" -ForegroundColor Gray

# ============================================================================
# STEP 2: Ingest a markdown doc (v2: no immutable_schema_ref)
# ============================================================================
Write-Host "`n=== STEP 2: Ingesting a markdown document ===" -ForegroundColor Cyan

$testFile = ".\docs\tests\test-pack\a2-v4.8-10787.docx.md"
if (-not (Test-Path $testFile)) { $testFile = ".\docs\tests\test-pack\sample-doc.md" }
if (-not (Test-Path $testFile)) { throw "No test markdown file found." }

Write-Host "Using markdown file: $testFile" -ForegroundColor Gray
Write-Host "Calling POST /functions/v1/ingest..." -ForegroundColor Gray

$ingestResult = curl.exe -sS -X POST "$env:SUPABASE_URL/functions/v1/ingest" `
    -H "Authorization: Bearer $token" `
    -H "apikey: $env:SUPABASE_ANON_KEY" `
    -F "doc_title=Test Document" `
    -F "file=@$testFile;type=text/markdown"

$ingest = $ingestResult | ConvertFrom-Json
if ($ingest.error) { throw "Ingest error: $($ingest.error)" }
if (-not $ingest.conv_uid) { throw "Ingest did not return conv_uid (expected for .md uploads)" }

$conv_uid = $ingest.conv_uid
Write-Host "Ingested conv_uid: $conv_uid (blocks_count=$($ingest.blocks_count))" -ForegroundColor Green

# ============================================================================
# STEP 3: Upload schema
# ============================================================================
Write-Host "`n=== STEP 3: Uploading annotation schema ===" -ForegroundColor Cyan

$schemaFile = if ($env:SCHEMA_FILE) { $env:SCHEMA_FILE } else { "" }
if (-not $schemaFile) { $schemaFile = ".\docs\tests\user-defined\prose-optimizer-v1.schema.json" }
if (-not (Test-Path $schemaFile)) { $schemaFile = ".\json-schemas\user-defined\prose-optimizer-v1.schema.json" }
if (-not (Test-Path $schemaFile)) { throw "Missing schema file. Set `$env:SCHEMA_FILE or add a schema under docs/tests/user-defined/." }

Write-Host "Uploading schema file: $schemaFile" -ForegroundColor Gray
Write-Host "Calling POST /functions/v1/schemas..." -ForegroundColor Gray

$schemaRespRaw = curl.exe -sS -X POST "$env:SUPABASE_URL/functions/v1/schemas" `
    -H "Authorization: Bearer $token" `
    -H "apikey: $env:SUPABASE_ANON_KEY" `
    -F "schema=@$schemaFile;type=application/json"

$schemaResp = $schemaRespRaw | ConvertFrom-Json
if ($schemaResp.error) { throw "Schema upload error: $($schemaResp.error)" }
if (-not $schemaResp.schema_id) { throw "Schema upload did not return schema_id" }

$schema_id = $schemaResp.schema_id
$schema_ref = $schemaResp.schema_ref
$schema_uid = $schemaResp.schema_uid

Write-Host "Schema stored!" -ForegroundColor Green
Write-Host "  schema_id: $schema_id" -ForegroundColor Gray
Write-Host "  schema_ref: $schema_ref" -ForegroundColor Gray
Write-Host "  schema_uid: $schema_uid" -ForegroundColor Gray

# ============================================================================
# STEP 4: Create run (v2: conv_uid instead of doc_uid)
# ============================================================================
Write-Host "`n=== STEP 4: Creating annotation run (no worker yet) ===" -ForegroundColor Cyan

$runBody = (@{ conv_uid = $conv_uid; schema_id = $schema_id } | ConvertTo-Json -Compress)
$runBodyPath = Join-Path $env:TEMP "run-create-body.json"
# Use ASCII to avoid UTF-8 BOM issues in some JSON parsers.
Set-Content -LiteralPath $runBodyPath -Value $runBody -Encoding Ascii

$runBodyArg = "@" + $runBodyPath
$runRespRaw = curl.exe -sS -X POST "$env:SUPABASE_URL/functions/v1/runs" `
    -H "Authorization: Bearer $token" `
    -H "apikey: $env:SUPABASE_ANON_KEY" `
    -H "Content-Type: application/json" `
    --data-binary $runBodyArg

$runResp = $runRespRaw | ConvertFrom-Json
if ($runResp.error) { throw "Run create error: $($runResp.error)" }
if (-not $runResp.run_id) { throw "Run create did not return run_id" }

$run_id = $runResp.run_id
Write-Host "Run created! run_id=$run_id total_blocks=$($runResp.total_blocks)" -ForegroundColor Green

# ============================================================================
# STEP 5: Export JSONL by run_id (v2 export shape)
# ============================================================================
Write-Host "`n=== STEP 5: Exporting JSONL by run_id ===" -ForegroundColor Cyan

$exportFile = ".\scripts\export-run-$run_id.jsonl"
curl.exe -sS -L "$env:SUPABASE_URL/functions/v1/export-jsonl?run_id=$run_id" `
    -H "Authorization: Bearer $token" `
    -H "apikey: $env:SUPABASE_ANON_KEY" `
    -o $exportFile

if (-not (Test-Path $exportFile)) { throw "Export failed - no file created" }

$lines = Get-Content $exportFile
if ($lines.Count -lt 1) { throw "Export failed - empty file" }

Write-Host "Export successful! $($lines.Count) blocks exported" -ForegroundColor Green
Write-Host "Saved to: $exportFile" -ForegroundColor Gray

$first = $lines[0] | ConvertFrom-Json
Write-Host "`n=== First block (sample) ===" -ForegroundColor Cyan
$first | ConvertTo-Json -Depth 10

Write-Host "`n=== Verifying v2 export shape ===" -ForegroundColor Cyan
$valid = $true

# Verify immutable structure
if (-not $first.immutable) {
    Write-Host "MISSING: immutable" -ForegroundColor Red; $valid = $false
}
if (-not $first.immutable.source_upload.source_uid) {
    Write-Host "MISSING: immutable.source_upload.source_uid" -ForegroundColor Red; $valid = $false
}
if (-not $first.immutable.conversion.conv_uid) {
    Write-Host "MISSING: immutable.conversion.conv_uid" -ForegroundColor Red; $valid = $false
}
if (-not $first.immutable.block.block_uid) {
    Write-Host "MISSING: immutable.block.block_uid" -ForegroundColor Red; $valid = $false
}

# Verify user_defined with schema from the run
if ($first.user_defined.schema_ref -ne $schema_ref) {
    Write-Host "Expected user_defined.schema_ref=$schema_ref, got '$($first.user_defined.schema_ref)'" -ForegroundColor Red
    $valid = $false
}
if ($first.user_defined.schema_uid -ne $schema_uid) {
    Write-Host "Expected user_defined.schema_uid=$schema_uid, got '$($first.user_defined.schema_uid)'" -ForegroundColor Red
    $valid = $false
}
if ($null -eq $first.user_defined.data) {
    Write-Host "MISSING: user_defined.data" -ForegroundColor Red; $valid = $false
}

if ($valid) {
    Write-Host "v2 export shape OK (schema_ref + schema_uid present in user_defined; data exists)." -ForegroundColor Green
} else {
    throw "v2 export shape validation failed."
}

Write-Host "`n=== SMOKE TEST COMPLETE ===" -ForegroundColor Green
Write-Host "conv_uid: $conv_uid" -ForegroundColor Gray
Write-Host "schema_id: $schema_id" -ForegroundColor Gray
Write-Host "run_id: $run_id" -ForegroundColor Gray
