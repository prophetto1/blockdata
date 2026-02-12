# Benchmark worker prompt caching with paired OFF/ON runs on the same document+schema.
# Run from project root:
#   .\scripts\benchmark-worker-prompt-caching.ps1
# Optional args:
#   -ConvUid <conv_uid> -SchemaId <schema_id> -BatchSize 25

param(
    [string]$ConvUid = "2b79a0a8c44e07dd60843efcf21a4ccf7b1d659bf9e27a3706c83317fc72a254",
    [string]$SchemaId = "82017f64-3833-485f-86af-4d3a61ffc131",
    [int]$BatchSize = 25
)

$ErrorActionPreference = "Stop"

function Load-DotEnv {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return }
    Get-Content -Path $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $parts = $line -split "=", 2
        if ($parts.Count -ne 2) { return }
        $key = $parts[0].Trim()
        $value = $parts[1]
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if (-not (Get-Item "Env:$key" -ErrorAction SilentlyContinue)) {
            Set-Item -Path "Env:$key" -Value $value
        }
    }
}

function Require-EnvVar {
    param([string]$Name)
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Missing required env var: $Name"
    }
    return $value
}

function Get-AuthToken {
    param(
        [string]$SupabaseUrl,
        [string]$AnonKey,
        [string]$Email,
        [string]$Password
    )
    $authResponse = Invoke-RestMethod `
        -Method Post `
        -Uri "$SupabaseUrl/auth/v1/token?grant_type=password" `
        -Headers @{ apikey = $AnonKey; "Content-Type" = "application/json" } `
        -Body (@{ email = $Email; password = $Password } | ConvertTo-Json)

    $token = ($authResponse.access_token | ForEach-Object { $_ })
    if ($token -is [string]) { $token = $token.Trim() }
    if (-not $token) {
        throw "Authentication returned no access_token."
    }
    return $token
}

function Estimate-CostUsd {
    param([hashtable]$Usage)
    $inputRate = 3.0 / 1000000.0
    $outputRate = 15.0 / 1000000.0
    $cacheWriteRate = 3.0 * 1.25 / 1000000.0
    $cacheReadRate = 3.0 * 0.10 / 1000000.0

    return (($Usage.input_tokens * $inputRate) +
        ($Usage.output_tokens * $outputRate) +
        ($Usage.cache_creation_input_tokens * $cacheWriteRate) +
        ($Usage.cache_read_input_tokens * $cacheReadRate))
}

function Get-IntOrZero {
    param($Value)
    if ($null -eq $Value) { return 0 }
    return [int]$Value
}

function Invoke-WorkerPass {
    param(
        [string]$SupabaseUrl,
        [string]$AnonKey,
        [string]$Token,
        [string]$WorkerBearerToken,
        [string]$ConvUid,
        [string]$SchemaId,
        [int]$BatchSize,
        [bool]$PromptCachingEnabled,
        [string]$Label
    )

    Write-Host ""
    Write-Host "=== $Label (prompt_caching_enabled=$PromptCachingEnabled) ===" -ForegroundColor Cyan

    $createRunBody = @{
        conv_uid = $ConvUid
        schema_id = $SchemaId
        model_config = @{
            temperature = 0
            max_tokens_per_block = 2000
        }
    } | ConvertTo-Json -Compress

    $runBodyPath = Join-Path $env:TEMP ("benchmark-run-create-" + [guid]::NewGuid().ToString("N") + ".json")
    $runRespPath = Join-Path $env:TEMP ("benchmark-run-response-" + [guid]::NewGuid().ToString("N") + ".json")
    Set-Content -LiteralPath $runBodyPath -Value $createRunBody -Encoding Ascii
    $runBodyArg = "@" + $runBodyPath
    try {
        $runHttpCode = curl.exe -sS -o $runRespPath -w "%{http_code}" -X POST "$SupabaseUrl/functions/v1/runs" `
            -H "Authorization: Bearer $Token" `
            -H "apikey: $AnonKey" `
            -H "Content-Type: application/json" `
            --data-binary $runBodyArg
    } finally {
        Remove-Item -LiteralPath $runBodyPath -ErrorAction SilentlyContinue
    }
    try {
        $runRespRaw = Get-Content -LiteralPath $runRespPath -Raw
    } finally {
        Remove-Item -LiteralPath $runRespPath -ErrorAction SilentlyContinue
    }
    $runStatus = [int]$runHttpCode
    if ($runStatus -lt 200 -or $runStatus -ge 300) {
        throw "Run creation HTTP $runStatus ($Label): $runRespRaw"
    }

    $runResp = $runRespRaw | ConvertFrom-Json
    if ($runResp.error) { throw "Run creation failed ($Label): $($runResp.error)" }
    if (-not $runResp.run_id) { throw "Run creation returned no run_id ($Label)." }

    $runId = [string]$runResp.run_id
    $totalBlocks = [int]$runResp.total_blocks
    Write-Host "Run created: $runId (total_blocks=$totalBlocks)" -ForegroundColor Gray

    $usage = @{
        call_count = 0
        input_tokens = 0
        output_tokens = 0
        cache_creation_input_tokens = 0
        cache_read_input_tokens = 0
        cache_hit_calls = 0
    }

    $invocations = 0
    $maxInvocations = 200
    $startedAt = Get-Date
    $remainingPending = -1

    while ($invocations -lt $maxInvocations) {
        $invocations++
        $workerBody = @{
            run_id = $runId
            batch_size = $BatchSize
            prompt_caching_enabled = $PromptCachingEnabled
        } | ConvertTo-Json -Compress

        $workerBodyPath = Join-Path $env:TEMP ("benchmark-worker-body-" + [guid]::NewGuid().ToString("N") + ".json")
        $workerRespPath = Join-Path $env:TEMP ("benchmark-worker-response-" + [guid]::NewGuid().ToString("N") + ".json")
        Set-Content -LiteralPath $workerBodyPath -Value $workerBody -Encoding Ascii
        $workerBodyArg = "@" + $workerBodyPath
        try {
            $workerHttpCode = curl.exe -sS -o $workerRespPath -w "%{http_code}" -X POST "$SupabaseUrl/functions/v1/worker" `
                -H "Authorization: Bearer $WorkerBearerToken" `
                -H "apikey: $AnonKey" `
                -H "Content-Type: application/json" `
                --data-binary $workerBodyArg
        } finally {
            Remove-Item -LiteralPath $workerBodyPath -ErrorAction SilentlyContinue
        }
        try {
            $workerRespRaw = Get-Content -LiteralPath $workerRespPath -Raw
        } finally {
            Remove-Item -LiteralPath $workerRespPath -ErrorAction SilentlyContinue
        }
        $workerStatus = [int]$workerHttpCode
        if ($workerStatus -lt 200 -or $workerStatus -ge 300) {
            throw "Worker HTTP $workerStatus ($Label, run=$runId): $workerRespRaw"
        }

        $workerResp = $workerRespRaw | ConvertFrom-Json
        if ($workerResp.error) {
            throw "Worker failed ($Label, run=$runId): $($workerResp.error)"
        }

        if ($workerResp.usage) {
            $usage.call_count += Get-IntOrZero $workerResp.usage.call_count
            $usage.input_tokens += Get-IntOrZero $workerResp.usage.input_tokens
            $usage.output_tokens += Get-IntOrZero $workerResp.usage.output_tokens
            $usage.cache_creation_input_tokens += Get-IntOrZero $workerResp.usage.cache_creation_input_tokens
            $usage.cache_read_input_tokens += Get-IntOrZero $workerResp.usage.cache_read_input_tokens
            $usage.cache_hit_calls += Get-IntOrZero $workerResp.usage.cache_hit_calls
        }

        if ($workerResp.remaining_pending -ne $null) {
            $remainingPending = [int]$workerResp.remaining_pending
            Write-Host ("  invoke {0}: claimed={1}, succeeded={2}, failed={3}, remaining_pending={4}" -f `
                $invocations, $workerResp.claimed, $workerResp.succeeded, $workerResp.failed, $remainingPending) -ForegroundColor DarkGray
            if ($remainingPending -le 0) { break }
            continue
        }

        if ($workerResp.message -eq "No pending blocks") {
            $remainingPending = 0
            break
        }
    }

    if ($invocations -ge $maxInvocations) {
        throw "Exceeded max worker invocations ($maxInvocations) for run $runId."
    }

    $finishedAt = Get-Date
    $elapsedSec = [Math]::Round(($finishedAt - $startedAt).TotalSeconds, 2)

    $runState = Invoke-RestMethod `
        -Method Get `
        -Uri "$SupabaseUrl/rest/v1/runs_v2?run_id=eq.$runId&select=run_id,status,total_blocks,completed_blocks,failed_blocks,started_at,completed_at&limit=1" `
        -Headers @{
            "apikey" = $AnonKey
            "Authorization" = "Bearer $Token"
        }

    if (-not $runState -or $runState.Count -eq 0) {
        throw "Could not read run state for run_id=$runId."
    }
    $runRow = $runState[0]

    $costUsd = Estimate-CostUsd -Usage $usage
    $summary = [ordered]@{
        label = $Label
        prompt_caching_enabled = $PromptCachingEnabled
        run_id = $runId
        total_blocks = $totalBlocks
        worker_invocations = $invocations
        elapsed_seconds = $elapsedSec
        run_status = $runRow.status
        completed_blocks = [int]$runRow.completed_blocks
        failed_blocks = [int]$runRow.failed_blocks
        usage = $usage
        estimated_cost_usd = [Math]::Round($costUsd, 6)
    }

    Write-Host ("Completed {0}: run_status={1}, completed={2}, failed={3}, est_cost_usd={4}" -f `
        $Label, $summary.run_status, $summary.completed_blocks, $summary.failed_blocks, $summary.estimated_cost_usd) -ForegroundColor Green

    return $summary
}

Load-DotEnv -Path ".\.env"

$supabaseUrl = Require-EnvVar "SUPABASE_URL"
$anonKey = Require-EnvVar "SUPABASE_ANON_KEY"
$testEmail = Require-EnvVar "TEST_EMAIL"
$testPassword = Require-EnvVar "TEST_PASSWORD"
$workerBearerTokenOverride = [Environment]::GetEnvironmentVariable("WORKER_BEARER_TOKEN")

Write-Host "Authenticating benchmark user..." -ForegroundColor Cyan
$token = Get-AuthToken -SupabaseUrl $supabaseUrl -AnonKey $anonKey -Email $testEmail -Password $testPassword
# Default worker invocation uses the same user access token.
# Override with WORKER_BEARER_TOKEN only when explicitly testing another auth mode.
$workerBearerToken = if ([string]::IsNullOrWhiteSpace($workerBearerTokenOverride)) { $token } else { $workerBearerTokenOverride }
$workerBearerSource = if ([string]::IsNullOrWhiteSpace($workerBearerTokenOverride)) { "user_access_token_default" } else { "env_WORKER_BEARER_TOKEN" }

$off = Invoke-WorkerPass `
    -SupabaseUrl $supabaseUrl `
    -AnonKey $anonKey `
    -Token $token `
    -WorkerBearerToken $workerBearerToken `
    -ConvUid $ConvUid `
    -SchemaId $SchemaId `
    -BatchSize $BatchSize `
    -PromptCachingEnabled $false `
    -Label "cache_off"

$on = Invoke-WorkerPass `
    -SupabaseUrl $supabaseUrl `
    -AnonKey $anonKey `
    -Token $token `
    -WorkerBearerToken $workerBearerToken `
    -ConvUid $ConvUid `
    -SchemaId $SchemaId `
    -BatchSize $BatchSize `
    -PromptCachingEnabled $true `
    -Label "cache_on"

$summary = [ordered]@{
    benchmark_at_utc = (Get-Date).ToUniversalTime().ToString("o")
    supabase_project = ($supabaseUrl -replace '^https://', '' -replace '\.supabase\.co$', '')
    auth_mode = [ordered]@{
        run_creation = "user_access_token"
        worker_invocation = $workerBearerSource
    }
    conv_uid = $ConvUid
    schema_id = $SchemaId
    batch_size = $BatchSize
    pricing_assumptions = [ordered]@{
        input_usd_per_million = 3.0
        output_usd_per_million = 15.0
        cache_write_multiplier = 1.25
        cache_read_multiplier = 0.10
    }
    runs = @($off, $on)
    deltas = [ordered]@{
        estimated_cost_usd_delta = [Math]::Round(($off.estimated_cost_usd - $on.estimated_cost_usd), 6)
        estimated_cost_usd_reduction_pct = if ($off.estimated_cost_usd -gt 0) {
            [Math]::Round((($off.estimated_cost_usd - $on.estimated_cost_usd) / $off.estimated_cost_usd) * 100.0, 2)
        } else { 0 }
        input_tokens_delta = [int]($off.usage.input_tokens - $on.usage.input_tokens)
        output_tokens_delta = [int]($off.usage.output_tokens - $on.usage.output_tokens)
        cache_creation_input_tokens_on = [int]$on.usage.cache_creation_input_tokens
        cache_read_input_tokens_on = [int]$on.usage.cache_read_input_tokens
    }
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = ".\scripts\logs\prompt-caching-benchmark-$timestamp.json"
$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $outFile -Encoding Ascii

Write-Host ""
Write-Host "Benchmark complete." -ForegroundColor Green
Write-Host "Result file: $outFile" -ForegroundColor Gray
$summary | ConvertTo-Json -Depth 8
