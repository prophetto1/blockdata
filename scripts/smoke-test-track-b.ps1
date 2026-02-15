param(
    [ValidateSet("both", "transform", "extract")]
    [string]$FlowMode = "both",
    [int]$PollIntervalSeconds = 5,
    [int]$TimeoutSeconds = 600
)

$ErrorActionPreference = "Stop"

if (-not $env:SUPABASE_URL) { $env:SUPABASE_URL = "https://dbdzzhshmigewyprahej.supabase.co" }
if (-not $env:SUPABASE_ANON_KEY) { $env:SUPABASE_ANON_KEY = "<SET_SUPABASE_ANON_KEY>" }

if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_URL.StartsWith("http")) {
    throw "SUPABASE_URL is missing or invalid."
}
if (-not $env:SUPABASE_ANON_KEY -or $env:SUPABASE_ANON_KEY -like "<SET_*") {
    throw "SUPABASE_ANON_KEY is missing."
}
if (-not $env:TRACK_B_WORKER_KEY) {
    throw "TRACK_B_WORKER_KEY is required to call /functions/v1/track-b-worker."
}

function Read-PasswordPlaintext() {
    $sec = Read-Host -AsSecureString "Test user password"
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

function Invoke-JsonPost([string]$Url, [hashtable]$Headers, $Body) {
    $json = $Body | ConvertTo-Json -Depth 20 -Compress
    return Invoke-RestMethod -Method Post -Uri $Url -Headers $Headers -Body $json -ContentType "application/json"
}

function Ensure-SourceDocs([string]$token, [string]$projectId) {
    $rows = Invoke-RestMethod `
        -Method Get `
        -Uri "$env:SUPABASE_URL/rest/v1/documents_v2?select=source_uid,status&project_id=eq.$projectId&order=uploaded_at.desc&limit=5" `
        -Headers @{
            "apikey"        = $env:SUPABASE_ANON_KEY
            "Authorization" = "Bearer $token"
        }

    if ($rows -and $rows.Count -gt 0) {
        return @($rows | ForEach-Object { $_.source_uid })
    }

    $fixture = ".\docs\tests\test-pack\sample-doc.md"
    if (-not (Test-Path $fixture)) {
        $fixture = ".\docs\tests\test-pack\a2-v4.8-10787.docx.md"
    }
    if (-not (Test-Path $fixture)) {
        throw "No source docs in project and no markdown fixture found."
    }

    Write-Host "No existing docs found. Ingesting fixture: $fixture" -ForegroundColor Yellow
    $ingestRaw = curl.exe -sS -X POST "$env:SUPABASE_URL/functions/v1/ingest" `
        -H "Authorization: Bearer $token" `
        -H "apikey: $env:SUPABASE_ANON_KEY" `
        -F "doc_title=Track B Smoke Source" `
        -F "project_id=$projectId" `
        -F "file=@$fixture;type=text/markdown"
    $ingest = $ingestRaw | ConvertFrom-Json
    if ($ingest.error) { throw "Ingest error: $($ingest.error)" }
    if (-not $ingest.source_uid) { throw "Ingest did not return source_uid" }
    return @($ingest.source_uid)
}

function Upload-TrackBSchema([string]$token) {
    $schemaFile = ".\docs\tests\user-defined\prose-optimizer-v1.schema.json"
    if (-not (Test-Path $schemaFile)) {
        $schemaFile = ".\json-schemas\user-defined\prose-optimizer-v1.schema.json"
    }
    if (-not (Test-Path $schemaFile)) {
        throw "Schema file not found for extract flow."
    }

    $respRaw = curl.exe -sS -X POST "$env:SUPABASE_URL/functions/v1/schemas" `
        -H "Authorization: Bearer $token" `
        -H "apikey: $env:SUPABASE_ANON_KEY" `
        -F "schema=@$schemaFile;type=application/json"
    $resp = $respRaw | ConvertFrom-Json
    if ($resp.error) { throw "Schema upload error: $($resp.error)" }
    if (-not $resp.schema_uid) { throw "Schema upload did not return schema_uid" }
    return $resp.schema_uid
}

function Assert-DocStepOrder($doc) {
    $ts = @(
        $doc.step_indexed_at,
        $doc.step_downloaded_at,
        $doc.step_partitioned_at,
        $doc.step_chunked_at,
        $doc.step_embedded_at,
        $doc.step_uploaded_at
    )
    foreach ($v in $ts) {
        if (-not $v) { throw "Missing step timestamp on source_uid=$($doc.source_uid)" }
    }

    $dt = $ts | ForEach-Object { [DateTimeOffset]::Parse($_).ToUnixTimeMilliseconds() }
    for ($i = 1; $i -lt $dt.Count; $i++) {
        if ($dt[$i] -lt $dt[$i - 1]) {
            throw "Out-of-order step timestamps on source_uid=$($doc.source_uid)"
        }
    }
}

function Invoke-TrackBCase(
    [string]$token,
    [string]$workspaceId,
    [string]$projectId,
    [string]$flow,
    [string[]]$selectedSourceUids,
    [string]$schemaUid = $null,
    [string]$caseName
) {
    Write-Host "`n=== Track B Case: $caseName ===" -ForegroundColor Cyan
    $idempotencyKey = [guid]::NewGuid().ToString()
    $body = @{
        workspace_id = $workspaceId
        project_id = $projectId
        flow_mode = $flow
        selected_source_uids = $selectedSourceUids
        workflow_template_key = "track-b-default"
    }
    if ($flow -eq "extract") {
        $body.user_schema_uid = $schemaUid
    }

    $create = Invoke-RestMethod `
        -Method Post `
        -Uri "$env:SUPABASE_URL/functions/v1/track-b-runs" `
        -Headers @{
            "Authorization"   = "Bearer $token"
            "apikey"          = $env:SUPABASE_ANON_KEY
            "Idempotency-Key" = $idempotencyKey
            "Content-Type"    = "application/json"
        } `
        -Body ($body | ConvertTo-Json -Depth 20 -Compress)

    if (-not $create.run_uid) { throw "run_uid missing for case $caseName" }
    $runUid = $create.run_uid
    Write-Host "run_uid: $runUid (status=$($create.status))" -ForegroundColor Gray

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $runData = $null

    while ((Get-Date) -lt $deadline) {
        try {
            $workerRespRaw = curl.exe -sS -X POST "$env:SUPABASE_URL/functions/v1/track-b-worker" `
                -H "X-Track-B-Worker-Key: $env:TRACK_B_WORKER_KEY" `
                -H "Content-Type: application/json" `
                --data '{"batch_size": 5}'
            $null = $workerRespRaw
        } catch {
        }

        $runData = Invoke-RestMethod `
            -Method Get `
            -Uri "$env:SUPABASE_URL/functions/v1/track-b-runs?workspace_id=$workspaceId&run_uid=$runUid" `
            -Headers @{
                "Authorization" = "Bearer $token"
                "apikey" = $env:SUPABASE_ANON_KEY
            }

        $status = $runData.run.status
        Write-Host "status=$status docs=$($runData.docs.Count) artifacts=$($runData.artifacts.Count)" -ForegroundColor Gray
        if ($status -in @("success", "partial_success", "failed", "cancelled")) {
            break
        }
        Start-Sleep -Seconds $PollIntervalSeconds
    }

    if (-not $runData) { throw "No run data for case $caseName" }
    if ($runData.run.status -in @("failed", "cancelled")) {
        throw "Run terminal failure for case ${caseName}: $($runData.run.status)"
    }

    $requiredSteps = @("partition", "chunk", "embed", "preview", "persist")
    $docsBySource = @{}
    foreach ($d in $runData.docs) {
        $docsBySource[$d.source_uid] = $d
    }

    foreach ($sourceUid in $selectedSourceUids) {
        if (-not $docsBySource.ContainsKey($sourceUid)) {
            throw "Missing run_doc for source_uid=$sourceUid in case $caseName"
        }
        $doc = $docsBySource[$sourceUid]
        if ($doc.status -ne "success") {
            throw "Doc did not reach success for source_uid=$sourceUid (status=$($doc.status))"
        }
        Assert-DocStepOrder $doc

        $steps = @($runData.artifacts | Where-Object { $_.source_uid -eq $sourceUid } | ForEach-Object { $_.step_name })
        foreach ($step in $requiredSteps) {
            if (-not ($steps -contains $step)) {
                throw "Missing artifact step '$step' for source_uid=$sourceUid in case $caseName"
            }
        }
    }

    $stateEvents = Invoke-RestMethod `
        -Method Get `
        -Uri "$env:SUPABASE_URL/rest/v1/unstructured_state_events_v2?select=entity_type,source_uid,detail_json&run_uid=eq.$runUid&order=created_at.asc" `
        -Headers @{
            "Authorization" = "Bearer $token"
            "apikey" = $env:SUPABASE_ANON_KEY
        }

    $runObs = @($stateEvents | Where-Object { $_.entity_type -eq "run" -and $_.detail_json.event -eq "run_observability" })
    if ($runObs.Count -lt 1) {
        throw "Missing run_observability state event for case $caseName"
    }
    foreach ($sourceUid in $selectedSourceUids) {
        $docObs = @($stateEvents | Where-Object {
            $_.entity_type -eq "doc" -and $_.source_uid -eq $sourceUid -and $_.detail_json.event -eq "doc_observability"
        })
        if ($docObs.Count -lt 1) {
            throw "Missing doc_observability state event for source_uid=$sourceUid in case $caseName"
        }
    }

    return [PSCustomObject]@{
        case_name = $caseName
        run_uid = $runUid
        flow_mode = $flow
        selected_count = $selectedSourceUids.Count
        status = $runData.run.status
        artifact_count = $runData.artifacts.Count
        observability_events = $stateEvents.Count
    }
}

Write-Host "`n=== Track B E2E Smoke ===" -ForegroundColor Cyan

$testEmail = if ($env:TEST_EMAIL) { $env:TEST_EMAIL } else { Read-Host "Test user email" }
$testPassword = if ($env:TEST_PASSWORD) { $env:TEST_PASSWORD } else { Read-PasswordPlaintext }

$auth = Invoke-RestMethod `
    -Method Post `
    -Uri "$env:SUPABASE_URL/auth/v1/token?grant_type=password" `
    -Headers @{ apikey = $env:SUPABASE_ANON_KEY; "Content-Type" = "application/json" } `
    -Body (@{ email = $testEmail; password = $testPassword } | ConvertTo-Json)

$token = $auth.access_token
if (-not $token) { throw "Authentication failed: missing access token." }

$projects = Invoke-RestMethod `
    -Method Get `
    -Uri "$env:SUPABASE_URL/rest/v1/projects?select=project_id,workspace_id,project_name&order=created_at.asc&limit=1" `
    -Headers @{
        "Authorization" = "Bearer $token"
        "apikey" = $env:SUPABASE_ANON_KEY
    }
if (-not $projects -or $projects.Count -eq 0) { throw "No projects found." }

$project = $projects[0]
$projectId = $project.project_id
$workspaceId = $project.workspace_id
if (-not $workspaceId) { throw "project.workspace_id is required for Track B runs." }

Write-Host "Using project: $($project.project_name) ($projectId)" -ForegroundColor Gray
Write-Host "Using workspace: $workspaceId" -ForegroundColor Gray

$sourceUids = Ensure-SourceDocs -token $token -projectId $projectId
if ($sourceUids.Count -lt 1) { throw "No source_uids available for smoke runs." }

$schemaUid = $null
if ($FlowMode -in @("both", "extract")) {
    $schemaUid = Upload-TrackBSchema -token $token
    Write-Host "Uploaded schema_uid: $schemaUid" -ForegroundColor Gray
}

$results = @()

if ($FlowMode -in @("both", "transform")) {
    $results += Invoke-TrackBCase `
        -token $token `
        -workspaceId $workspaceId `
        -projectId $projectId `
        -flow "transform" `
        -selectedSourceUids @($sourceUids[0]) `
        -caseName "transform-single"

    if ($sourceUids.Count -ge 2) {
        $results += Invoke-TrackBCase `
            -token $token `
            -workspaceId $workspaceId `
            -projectId $projectId `
            -flow "transform" `
            -selectedSourceUids @($sourceUids[0], $sourceUids[1]) `
            -caseName "transform-multi-subset"
    }
}

if ($FlowMode -in @("both", "extract")) {
    $results += Invoke-TrackBCase `
        -token $token `
        -workspaceId $workspaceId `
        -projectId $projectId `
        -flow "extract" `
        -selectedSourceUids @($sourceUids[0]) `
        -schemaUid $schemaUid `
        -caseName "extract-single"

    if ($sourceUids.Count -ge 2) {
        $results += Invoke-TrackBCase `
            -token $token `
            -workspaceId $workspaceId `
            -projectId $projectId `
            -flow "extract" `
            -selectedSourceUids @($sourceUids[0], $sourceUids[1]) `
            -schemaUid $schemaUid `
            -caseName "extract-multi-subset"
    }
}

Write-Host "`n=== Track B Smoke Results ===" -ForegroundColor Green
$results | Format-Table -AutoSize

Write-Host "`nTrack B smoke completed successfully." -ForegroundColor Green
