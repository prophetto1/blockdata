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
Write-Host "JWT length: $($JWT.Length)"
Write-Host "JWT prefix: $($JWT.Substring(0, 50))..."

# Try invoking the worker with detailed error handling
$body = @{ run_id = "e4146074-ce29-42d7-a193-75ca53c0396d"; batch_size = 29; prompt_caching_enabled = $false } | ConvertTo-Json
Write-Host "Request body: $body"

try {
    $resp = Invoke-WebRequest -Uri "$SUPABASE_URL/functions/v1/worker" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $JWT"
            "apikey" = $ANON_KEY
            "Content-Type" = "application/json"
        } `
        -Body $body `
        -UseBasicParsing `
        -TimeoutSec 300
    Write-Host "Status: $($resp.StatusCode)"
    Write-Host "Body: $($resp.Content)"
} catch {
    $errResp = $_.Exception.Response
    Write-Host "Error status: $($errResp.StatusCode) ($([int]$errResp.StatusCode))"
    if ($errResp) {
        $stream = $errResp.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errBody = $reader.ReadToEnd()
        Write-Host "Error body: $errBody"
    } else {
        Write-Host "Exception: $($_.Exception.Message)"
    }
}
