$ErrorActionPreference = "Stop"

$KestraRoot = if ([string]::IsNullOrWhiteSpace($env:KESTRA_ROOT)) { "E:\\kestra" } else { $env:KESTRA_ROOT }
$ControllersRel = "webserver\\src\\main\\java\\io\\kestra\\webserver\\controllers\\api"

function Normalize-Uri([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return "" }
  $v = $value.Trim()
  $v = $v -replace "\\\\", "/"
  return $v
}

$controllersDir = Join-Path $KestraRoot $ControllersRel
if (!(Test-Path $controllersDir)) {
  throw "controllers dir not found: $controllersDir"
}

$files = Get-ChildItem -Path $controllersDir -Filter "*.java" | Sort-Object FullName

$results = @()

foreach ($file in $files) {
  $lines = Get-Content -LiteralPath $file.FullName
  $base = $null
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($null -eq $base) {
      $m = [regex]::Match($line, '@Controller\(\"(?<base>[^\"]*)\"')
      if ($m.Success) {
        $base = Normalize-Uri $m.Groups["base"].Value
      }
    }

    $http = [regex]::Match($line, '@(?<method>Get|Post|Put|Delete)\b')
    if ($http.Success) {
      $method = $http.Groups["method"].Value.ToUpperInvariant()
      $uri = ""

      # Most endpoints declare uri="...". Some have no uri and inherit base path.
      $mUri = [regex]::Match($line, 'uri\s*=\s*\"(?<uri>[^\"]*)\"')
      $mValue = [regex]::Match($line, 'value\s*=\s*\"(?<uri>[^\"]*)\"')
      $mPositional = [regex]::Match($line, '@(?:Get|Post|Put|Delete)\s*\(\s*\"(?<uri>[^\"]*)\"')
      if ($mUri.Success) {
        $uri = Normalize-Uri $mUri.Groups["uri"].Value
      } elseif ($mValue.Success) {
        $uri = Normalize-Uri $mValue.Groups["uri"].Value
      } elseif ($mPositional.Success) {
        $uri = Normalize-Uri $mPositional.Groups["uri"].Value
      }

      $full = $base
      if (![string]::IsNullOrWhiteSpace($uri)) {
        $needsSlash = ($full -notlike "*/") -and ($uri -notlike "/*")
        if ($needsSlash) {
          $full = "$full/$uri"
        } else {
          $full = "$full$uri"
        }
      }

      $results += [pscustomobject]@{
        file   = $file.FullName
        line   = $i + 1
        method = $method
        base   = $base
        uri    = $uri
        path   = $full
        raw    = $line.Trim()
      }
    }
  }
}

$results | ConvertTo-Json -Depth 4
