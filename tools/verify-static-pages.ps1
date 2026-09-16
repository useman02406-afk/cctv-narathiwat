param(
  [string]$OutputRoot = (Join-Path $PSScriptRoot '..\outputs')
)

$ErrorActionPreference = 'Stop'
$OutputRoot = (Resolve-Path $OutputRoot).Path
$required = @(
  'login.html', 'home.html', 'camera-center.html',
  'camera-management.html', 'camera-data-quality.html', 'admin-console.html',
  'investigations.html', 'critical-infrastructure.html', 'risk-areas.html',
  'risk-persons.html', 'vehicle-alerts.html', 'vehicle-sightings.html',
  'mission-planner.html', 'home-search.html', 'reports.html',
  'auth-guard.js', 'smart-alert.js', 'runtime-health.js'
)

$failed = [System.Collections.Generic.List[string]]::new()
foreach ($item in $required) {
  if (-not (Test-Path (Join-Path $OutputRoot $item))) {
    $failed.Add("Required file is missing: $item")
  }
}

$htmlFiles = Get-ChildItem -Path $OutputRoot -Filter '*.html' -File
foreach ($file in $htmlFiles) {
  $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
  $text = [System.Text.Encoding]::UTF8.GetString($bytes)
  if ($text.Contains([char]0xfffd)) { $failed.Add("Invalid UTF-8 character: $($file.Name)") }
  if ($text -notmatch '<meta\s+charset="utf-8"') { $failed.Add("Missing UTF-8 meta tag: $($file.Name)") }

  $references = [regex]::Matches($text, '(?:src|href)=["'']([^"''#?]+)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  foreach ($reference in $references) {
    $target = $reference.Groups[1].Value
    if ($target -match '^(?:https?:|data:|mailto:|javascript:|/|\$\{)') { continue }
    $resolved = Join-Path $file.DirectoryName $target
    if (-not (Test-Path -LiteralPath $resolved)) { $failed.Add("Broken local reference: $($file.Name) -> $target") }
  }
}

$cameraCenter = Get-Content (Join-Path $OutputRoot 'camera-center.html') -Raw -Encoding utf8
foreach ($tab in @('camera-locations-map.html', 'camera-management.html', 'camera-categories.html', 'camera-maintenance.html', 'camera-inspections.html', 'camera-data-quality.html', 'camera-duplicate-review.html')) {
  if ($cameraCenter -notmatch [regex]::Escape($tab)) { $failed.Add("Missing camera-center tab: $tab") }
}

if (Get-Command node -ErrorAction SilentlyContinue) {
  foreach ($js in Get-ChildItem -Path $OutputRoot -Filter '*.js' -File) {
    & node --check $js.FullName
    if ($LASTEXITCODE -ne 0) { $failed.Add("Invalid JavaScript syntax: $js") }
  }
  foreach ($file in $htmlFiles) {
    $text = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $inlineScripts = [regex]::Matches($text, '<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    for ($i = 0; $i -lt $inlineScripts.Count; $i++) {
      $tempScript = Join-Path ([System.IO.Path]::GetTempPath()) ("cctv-static-check-$([guid]::NewGuid().ToString('N')).js")
      try {
        [System.IO.File]::WriteAllText($tempScript, $inlineScripts[$i].Groups[1].Value, [System.Text.UTF8Encoding]::new($false))
        & node --check $tempScript
        if ($LASTEXITCODE -ne 0) { $failed.Add("Invalid inline JavaScript: $($file.Name) script #$($i + 1)") }
      } finally {
        Remove-Item $tempScript -Force -ErrorAction SilentlyContinue
      }
    }
  }
}

$login = Get-Content (Join-Path $OutputRoot 'login.html') -Raw -Encoding utf8
if ($login -notmatch "location\.replace\('home\.html'\)") { $failed.Add('Login does not route to the legacy home page') }

$authGuard = Get-Content (Join-Path $OutputRoot 'auth-guard.js') -Raw -Encoding utf8
if ($authGuard -match 'loadCommandShell|command-center-v2\.html#') { $failed.Add('Legacy modules still contain redesigned command-center routing') }
if ($authGuard -notmatch 'runtime-health\.js') { $failed.Add('Runtime health monitor is not loaded by auth guard') }

if ($failed.Count) {
  $failed | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Host "PASS: static page, UTF-8, and camera-center checks completed for $($htmlFiles.Count) HTML pages." -ForegroundColor Green
