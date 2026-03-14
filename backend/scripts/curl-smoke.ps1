param(
  [string]$BaseUrl = "http://127.0.0.1:5000"
)

$ErrorActionPreference = "Stop"

function Invoke-CurlStatus {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [string]$Body,
    [string]$BearerToken
  )

  if ([string]::IsNullOrWhiteSpace($Url)) {
    return -1
  }

  $args = @("-sS", "-o", "NUL", "-w", "%{http_code}", "-X", $Method.ToUpperInvariant())
  if ($BearerToken) {
    $args += @("-H", "Authorization: Bearer $BearerToken")
  }

  $tmpFile = $null
  if ($Body -ne $null) {
    # Avoid Windows cmdline quoting issues with JSON double-quotes by writing payload to a temp file.
    $tmpFile = Join-Path $env:TEMP ("curl-body-" + [guid]::NewGuid().ToString("N") + ".json")
    Set-Content -Path $tmpFile -Value $Body -Encoding UTF8 -NoNewline
    $args += @("-H", "Content-Type: application/json", "--data-binary", "@$tmpFile")
  }

  $args += $Url

  $code = & curl.exe @args 2>$null
  if ($tmpFile -and (Test-Path $tmpFile)) {
    Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
  }
  if ($code -match "^[0-9]{3}$") {
    return [int]$code
  }
  return -1
}

function Try-LoginToken {
  param(
    [Parameter(Mandatory = $true)][string]$Email
  )

  $url = "$BaseUrl/api/auth/login"
  $body = (@{ email = $Email } | ConvertTo-Json -Compress)
  $tmpFile = Join-Path $env:TEMP ("curl-login-" + [guid]::NewGuid().ToString("N") + ".json")
  Set-Content -Path $tmpFile -Value $body -Encoding UTF8 -NoNewline
  try {
    $json = & curl.exe -sS -X POST -H "Content-Type: application/json" --data-binary "@$tmpFile" $url | ConvertFrom-Json
    if ($null -ne $json.token -and $json.token.ToString().Length -gt 0) {
      return $json.token.ToString()
    }
    return $null
  } catch {
    return $null
  } finally {
    if (Test-Path $tmpFile) {
      Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
    }
  }
}

$oid = "507f1f77bcf86cd799439011"

$routes = @(
  @{ method = "GET";    path = "/health"; note = "public" }
  @{ method = "POST";   path = "/api/auth/login"; note = "public (expects body)" }
  @{ method = "POST";   path = "/api/auth/logout"; note = "public-ish (clears cookie/token)" }
  @{ method = "GET";    path = "/api/auth/me"; note = "auth" }

  @{ method = "POST";   path = "/api/attempts/start"; note = "candidate auth" }
  @{ method = "POST";   path = "/api/attempts/submit"; note = "candidate auth" }
  @{ method = "GET";    path = "/api/attempts/$oid/questions"; note = "candidate auth" }
  @{ method = "POST";   path = "/api/attempts/$oid/answers"; note = "candidate auth" }

  @{ method = "POST";   path = "/api/violations/log"; note = "candidate auth" }
  @{ method = "GET";    path = "/api/violations/$oid/count"; note = "candidate auth" }

  @{ method = "GET";    path = "/api/results/me"; note = "candidate auth" }

  @{ method = "GET";    path = "/api/admin/assessments"; note = "admin auth" }
  @{ method = "GET";    path = "/api/admin/assessments/$oid"; note = "admin auth" }
  @{ method = "GET";    path = "/api/admin/assessments/$oid/questions"; note = "admin auth" }
  @{ method = "GET";    path = "/api/admin/assessments/$oid/attempts"; note = "admin auth" }
  @{ method = "GET";    path = "/api/admin/attempts/$oid"; note = "admin auth" }
  @{ method = "GET";    path = "/api/admin/attempts/$oid/details"; note = "admin auth" }
  @{ method = "GET";    path = "/api/admin/attempts/$oid/violations"; note = "admin auth" }
  @{ method = "GET";    path = "/api/admin/attempts/$oid/descriptive"; note = "admin auth" }
  @{ method = "POST";   path = "/api/admin/answers/grade"; note = "admin auth" }
  @{ method = "POST";   path = "/api/admin/attempts/$oid/publish"; note = "admin auth" }
  @{ method = "DELETE"; path = "/api/admin/attempts/$oid"; note = "admin auth (destructive)" }
  @{ method = "POST";   path = "/api/admin/attempts/$oid/delete"; note = "admin auth (destructive)" }
  @{ method = "POST";   path = "/api/admin/assessments/$oid/publish-all"; note = "admin auth" }
  @{ method = "POST";   path = "/api/admin/assessments"; note = "admin auth (creates)" }
  @{ method = "PATCH";  path = "/api/admin/assessments/$oid"; note = "admin auth (mutates)" }
  @{ method = "DELETE"; path = "/api/admin/assessments/$oid"; note = "admin auth (destructive)" }
  @{ method = "POST";   path = "/api/admin/assessments/$oid/delete"; note = "admin auth (destructive)" }
  @{ method = "POST";   path = "/api/admin/assessments/$oid/questions"; note = "admin auth (creates)" }
  @{ method = "POST";   path = "/api/admin/assessments/$oid/questions/bulk"; note = "admin auth (creates)" }
  @{ method = "DELETE"; path = "/api/admin/assessments/$oid/questions/$oid"; note = "admin auth (destructive)" }
  @{ method = "DELETE"; path = "/api/admin/assessments/$oid/questions"; note = "admin auth (destructive)" }
  @{ method = "GET";    path = "/api/admin/candidates"; note = "admin auth" }
  @{ method = "POST";   path = "/api/admin/candidates"; note = "admin auth (creates)" }
  @{ method = "POST";   path = "/api/admin/candidates/bulk"; note = "admin auth (creates)" }
  @{ method = "DELETE"; path = "/api/admin/candidates/$oid"; note = "admin auth (destructive)" }
  @{ method = "POST";   path = "/api/admin/candidates/bulk-delete"; note = "admin auth (destructive)" }
  @{ method = "GET";    path = "/api/admin/dashboard-stats"; note = "admin auth" }
  @{ method = "GET";    path = "/api/admin/admins"; note = "admin auth" }
  @{ method = "POST";   path = "/api/admin/admins"; note = "admin auth (creates)" }
  @{ method = "DELETE"; path = "/api/admin/admins/$oid"; note = "admin auth (destructive)" }
)

$adminToken = Try-LoginToken -Email "admin@example.com"
$candidateToken = Try-LoginToken -Email "candidate@example.com"

Write-Host "Base URL: $BaseUrl"
Write-Host ("Admin token: " + ($(if ($adminToken) { "OK" } else { "MISSING (login failed)" })))
Write-Host ("Candidate token: " + ($(if ($candidateToken) { "OK" } else { "MISSING (login failed)" })))
Write-Host ""

$results = foreach ($r in $routes) {
  $url = "$BaseUrl$($r.path)"

  $body = $null
  if ($r.method -in @("POST", "PATCH")) {
    # Use minimal payloads to avoid side effects.
    if ($r.path -eq "/api/auth/login") {
      $body = (@{ email = "admin@example.com" } | ConvertTo-Json -Compress)
    } elseif ($r.path -like "*/answers/grade") {
      $body = (@{ answerId = $oid; marks = 0 } | ConvertTo-Json -Compress)
    } else {
      $body = "{}"
    }
  }

  $unauth = Invoke-CurlStatus -Method $r.method -Url $url -Body $body

  $authCode = $null
  if ($r.note -like "admin auth*") {
    if ($adminToken) {
      $authCode = Invoke-CurlStatus -Method $r.method -Url $url -Body $body -BearerToken $adminToken
    }
  } elseif ($r.note -like "candidate auth*") {
    if ($candidateToken) {
      $authCode = Invoke-CurlStatus -Method $r.method -Url $url -Body $body -BearerToken $candidateToken
    }
  } elseif ($r.note -eq "auth") {
    if ($adminToken) {
      $authCode = Invoke-CurlStatus -Method $r.method -Url $url -Body $body -BearerToken $adminToken
    }
  }

  [pscustomobject]@{
    Method = $r.method
    Path = $r.path
    Note = $r.note
    Unauth = $unauth
    Auth = $(if ($authCode -ne $null) { $authCode } else { "" })
  }
}

$results | Select-Object Method, Path, Unauth, Auth, Note | Format-Table -AutoSize
