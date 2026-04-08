$ErrorActionPreference = "Stop"

$SUPABASE_URL = "https://dbdzzhshmigewyprahej.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiZHp6aHNobWlnZXd5cHJhaGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDMxMDcsImV4cCI6MjA4NTU3OTEwN30.RFMyA3B6APTjXdMbOsURt_zzuAVFPB7Vug7gKPxGrac"

# Sign in
$authBody = @{ email = "jondev717@gmail.com"; password = "TestPass123!" } | ConvertTo-Json
$authResp = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/token?grant_type=password" `
    -Method POST `
    -Headers @{ "apikey" = $ANON_KEY; "Content-Type" = "application/json" } `
    -Body $authBody
$JWT = $authResp.access_token
Write-Host "Signed in. Token length: $($JWT.Length)"

# Run IDs (created via SQL)
$BASELINE_RUN = "e4146074-ce29-42d7-a193-75ca53c0396d"
$CACHING_RUN  = "4558c56c-2728-4fcd-94c2-8c202477e66b"

$workerHeaders = @{
    "Authorization" = "Bearer $JWT"
    "apikey"        = $ANON_KEY
    "Content-Type"  = "application/json"
}

# ── Benchmark A: Caching OFF (baseline) ──
Write-Host "`n=== BASELINE RUN (caching OFF) ==="
Write-Host "Run ID: $BASELINE_RUN"
Write-Host "Invoking worker..."
$startA = Get-Date
$bodyA = @{ run_id = $BASELINE_RUN; batch_size = 29; prompt_caching_enabled = $false } | ConvertTo-Json
$respA = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/worker" `
    -Method POST `
    -Headers $workerHeaders `
    -Body $bodyA `
    -TimeoutSec 300
$durationA = ((Get-Date) - $startA).TotalSeconds
Write-Host "Duration: $([math]::Round($durationA, 1))s"
Write-Host "Response:"
$respA | ConvertTo-Json -Depth 5 | Write-Host

# Save baseline result
$respA | ConvertTo-Json -Depth 5 | Set-Content "e:\writing-system\scripts\logs\p4-baseline-result.json"

# ── Benchmark B: Caching ON ──
Write-Host "`n=== CACHING RUN (caching ON) ==="
Write-Host "Run ID: $CACHING_RUN"
Write-Host "Invoking worker..."
$startB = Get-Date
$bodyB = @{ run_id = $CACHING_RUN; batch_size = 29; prompt_caching_enabled = $true } | ConvertTo-Json
$respB = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/worker" `
    -Method POST `
    -Headers $workerHeaders `
    -Body $bodyB `
    -TimeoutSec 300
$durationB = ((Get-Date) - $startB).TotalSeconds
Write-Host "Duration: $([math]::Round($durationB, 1))s"
Write-Host "Response:"
$respB | ConvertTo-Json -Depth 5 | Write-Host

# Save caching result
$respB | ConvertTo-Json -Depth 5 | Set-Content "e:\writing-system\scripts\logs\p4-caching-result.json"

# ── Summary ──
Write-Host "`n=== COMPARISON SUMMARY ==="
Write-Host "Baseline (OFF): $($respA.usage.input_tokens) input, $($respA.usage.output_tokens) output, $($respA.usage.cache_creation_input_tokens) cache_write, $($respA.usage.cache_read_input_tokens) cache_read, $($respA.usage.cache_hit_calls) cache_hits"
Write-Host "Caching  (ON):  $($respB.usage.input_tokens) input, $($respB.usage.output_tokens) output, $($respB.usage.cache_creation_input_tokens) cache_write, $($respB.usage.cache_read_input_tokens) cache_read, $($respB.usage.cache_hit_calls) cache_hits"
Write-Host "Duration: baseline=$([math]::Round($durationA, 1))s, caching=$([math]::Round($durationB, 1))s"
