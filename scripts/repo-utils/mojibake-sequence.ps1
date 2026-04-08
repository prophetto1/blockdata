[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [int]$MaxPasses = 3,

    [switch]$InPlace,

    [string]$OutputPath,

    [switch]$AllowResidual,

    [switch]$ShowMap
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Cp1252 = [System.Text.Encoding]::GetEncoding(1252)
$Utf8 = [System.Text.Encoding]::UTF8

function Convert-BadDecode {
    param([Parameter(Mandatory = $true)][string]$Text)
    return $script:Cp1252.GetString($script:Utf8.GetBytes($Text))
}

function Convert-FixDecode {
    param([Parameter(Mandatory = $true)][string]$Text)
    return $script:Utf8.GetString($script:Cp1252.GetBytes($Text))
}

function Count-Pattern {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [Parameter(Mandatory = $true)][string]$Pattern
    )
    return ([regex]::Matches($Text, [regex]::Escape($Pattern))).Count
}

function Get-SequenceMap {
    $codePoints = @(
        0x2019, # right single quote
        0x2018, # left single quote
        0x201C, # left double quote
        0x201D, # right double quote
        0x2014, # em dash
        0x2013, # en dash
        0x2026, # ellipsis
        0x2192, # right arrow
        0x00A7, # section sign
        0x00B1, # plus-minus
        0x2260, # not equal
        0x00A0, # nbsp
        0x2502, # box drawing light vertical
        0x2611  # ballot box with check
    )

    foreach ($cp in $codePoints) {
        $char = [string][char]$cp
        $mojibake1 = Convert-BadDecode -Text $char
        $mojibake2 = Convert-BadDecode -Text $mojibake1
        [pscustomobject]@{
            codepoint = ("U+{0:X4}" -f $cp)
            intended  = $char
            mojibake1 = $mojibake1
            mojibake2 = $mojibake2
        }
    }
}

function Get-MojibakeStats {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [Parameter(Mandatory = $true)][object[]]$Catalog
    )

    $replacementChar = Count-Pattern -Text $Text -Pattern ([string][char]0xFFFD)
    $singleTotal = 0
    $doubleTotal = 0
    $present = New-Object System.Collections.Generic.List[object]

    foreach ($row in $Catalog) {
        $singleCount = Count-Pattern -Text $Text -Pattern $row.mojibake1
        $doubleCount = Count-Pattern -Text $Text -Pattern $row.mojibake2
        $singleTotal += $singleCount
        $doubleTotal += $doubleCount
        if ($singleCount -gt 0 -or $doubleCount -gt 0) {
            $present.Add([pscustomobject]@{
                codepoint = $row.codepoint
                intended = $row.intended
                single = $singleCount
                double = $doubleCount
            }) | Out-Null
        }
    }

    # Weight replacement chars heavily because over-decoding introduces irreversible loss.
    $score = $singleTotal + (2 * $doubleTotal) + (20 * $replacementChar)
    return [pscustomobject]@{
        Score = [int]$score
        ReplacementChar = [int]$replacementChar
        SingleMatches = [int]$singleTotal
        DoubleMatches = [int]$doubleTotal
        TotalMatches = [int]($singleTotal + $doubleTotal)
        PresentPatterns = $present
    }
}

$resolved = (Resolve-Path -LiteralPath $Path).Path
$original = [System.IO.File]::ReadAllText($resolved, [System.Text.UTF8Encoding]::new($false, $false))
$catalog = @(Get-SequenceMap)
function Convert-TargetedMap {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [Parameter(Mandatory = $true)][object[]]$Catalog
    )

    $result = $Text

    # Replace longer/double mojibake tokens first, then single-pass tokens.
    $doubleRows = $Catalog | Sort-Object { $_.mojibake2.Length } -Descending
    foreach ($row in $doubleRows) {
        if ($result.Contains($row.mojibake2)) {
            $result = $result.Replace($row.mojibake2, $row.intended)
        }
    }

    $singleRows = $Catalog | Sort-Object { $_.mojibake1.Length } -Descending
    foreach ($row in $singleRows) {
        if ($result.Contains($row.mojibake1)) {
            $result = $result.Replace($row.mojibake1, $row.intended)
        }
    }

    return $result
}

$candidates = New-Object System.Collections.Generic.List[object]

$startStats = Get-MojibakeStats -Text $original -Catalog $catalog
$candidates.Add([pscustomobject]@{
    step = 0
    stage = "original"
    text = $original
    stats = $startStats
    accepted = $true
}) | Out-Null

# Stage 1: exactly one decode pass.
$pass1Text = Convert-FixDecode -Text $original
$pass1Stats = Get-MojibakeStats -Text $pass1Text -Catalog $catalog
$pass1Accept = ($pass1Stats.Score -lt $startStats.Score) -and ($pass1Stats.ReplacementChar -le $startStats.ReplacementChar)
$candidates.Add([pscustomobject]@{
    step = 1
    stage = "decode-pass-1"
    text = $pass1Text
    stats = $pass1Stats
    accepted = $pass1Accept
}) | Out-Null

$currentText = if ($pass1Accept) { $pass1Text } else { $original }
$currentStats = if ($pass1Accept) { $pass1Stats } else { $startStats }

# Stage 2: targeted cleanup only on remaining patterns.
for ($iter = 1; $iter -le $MaxPasses; $iter++) {
    if ($currentStats.TotalMatches -eq 0) {
        break
    }

    $targetedText = Convert-TargetedMap -Text $currentText -Catalog $catalog
    if ($targetedText -eq $currentText) {
        break
    }

    $targetedStats = Get-MojibakeStats -Text $targetedText -Catalog $catalog
    $accept = ($targetedStats.Score -lt $currentStats.Score) -and ($targetedStats.ReplacementChar -le $currentStats.ReplacementChar)

    $candidates.Add([pscustomobject]@{
        step = $iter
        stage = "targeted-$iter"
        text = $targetedText
        stats = $targetedStats
        accepted = $accept
    }) | Out-Null

    if (-not $accept) {
        break
    }

    $currentText = $targetedText
    $currentStats = $targetedStats
}

$best = $currentText
$bestStats = $currentStats
$bestRecord = $candidates | Where-Object { $_.text -eq $best } | Select-Object -Last 1
$improved = ($bestStats.Score -lt $startStats.Score)
$zeroResidual = ($bestStats.TotalMatches -eq 0)
$replacementSafe = ($bestStats.ReplacementChar -le $startStats.ReplacementChar)
$writeSafe = $improved -and $replacementSafe -and ($zeroResidual -or $AllowResidual)

"File: $resolved"
"Recommended action: $($bestRecord.stage)"
"Improves score: $improved"
"Zero residual patterns: $zeroResidual"
"Replacement-char safe: $replacementSafe"
"Pass stats:"
$candidates | ForEach-Object {
    [pscustomobject]@{
        stage = $_.stage
        step = $_.step
        accepted = $_.accepted
        score = $_.stats.Score
        replacementChar = $_.stats.ReplacementChar
        singleMatches = $_.stats.SingleMatches
        doubleMatches = $_.stats.DoubleMatches
        totalMatches = $_.stats.TotalMatches
    }
} | Format-Table -AutoSize

if ($bestStats.PresentPatterns.Count -gt 0) {
    ""
    "Patterns still present at recommended pass:"
    $bestStats.PresentPatterns | Sort-Object double, single -Descending | Format-Table -AutoSize
}

if ($ShowMap) {
    ""
    "Character sequence map (deterministic):"
    $catalog | Format-Table -AutoSize
}

if ($OutputPath) {
    $targetPath = $OutputPath
    [System.IO.File]::WriteAllText($targetPath, $best, [System.Text.UTF8Encoding]::new($false))
    ""
    "Wrote repaired candidate copy."
    "Output: $targetPath"
}

if ($InPlace -and $writeSafe -and $best -ne $original) {
    $backup = "$resolved.pre-mojibake-fix.bak"
    Copy-Item -LiteralPath $resolved -Destination $backup -Force
    [System.IO.File]::WriteAllText($resolved, $best, [System.Text.UTF8Encoding]::new($false))
    ""
    "Applied repair in place."
    "Backup: $backup"
} elseif ($InPlace) {
    ""
    if (-not $improved) {
        "No in-place changes made: no improving pass was found."
    } elseif (-not $replacementSafe) {
        "No in-place changes made: replacement-character safety gate failed."
    } elseif (-not $zeroResidual -and -not $AllowResidual) {
        "No in-place changes made: residual mojibake remains (use -AllowResidual to override)."
    } else {
        "No in-place changes made: safety gate blocked write."
    }
}
