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
  'station-overview.html', 'case-timeline.html',
  'module-navigation.css', 'module-navigation.js',
  'global-module-menu.css', 'global-module-menu.js',
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
  if ($text -match 'CCTV POLICE9') { $failed.Add("Legacy product name remains: $($file.Name)") }
  if ($text -match 'auth-guard\.js\?v=(?:1[0-6]|\d)\b') { $failed.Add("Stale auth guard cache version: $($file.Name)") }

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
if ($cameraCenter -notmatch 'data-admin-only') { $failed.Add('Camera category administration tab is not marked ADMIN-only') }
if ($cameraCenter -notmatch 'enforceAdminTabs') { $failed.Add('Camera center does not enforce ADMIN-only category navigation') }
$cameraCategories = Get-Content (Join-Path $OutputRoot 'camera-categories.html') -Raw -Encoding utf8
if ($cameraCategories -notmatch "if\s*\(\s*!admin\(\)\s*\).*location\.replace") {
  $failed.Add('Camera categories page does not redirect non-ADMIN users')
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

$dashboardHome = Get-Content (Join-Path $OutputRoot 'home.html') -Raw -Encoding utf8
$moduleNavigation = Get-Content (Join-Path $OutputRoot 'module-navigation.js') -Raw -Encoding utf8
$primaryModules = @(
  'home.html', 'station-overview.html', 'camera-center.html', 'investigations.html',
  'critical-infrastructure.html', 'risk-areas.html', 'risk-persons.html',
  'vehicle-alerts.html', 'mission-planner.html', 'home-search.html',
  'case-timeline.html', 'reports.html'
)
foreach ($module in $primaryModules) {
  if ($dashboardHome -notmatch [regex]::Escape($module)) { $failed.Add("Home navigation is missing module: $module") }
  if ($moduleNavigation -notmatch [regex]::Escape($module)) { $failed.Add("Module switcher is missing module: $module") }
}
if (([regex]::Matches($moduleNavigation, "\['[^']+','fa-[^']+','[^']+\.html'")).Count -ne 12) {
  $failed.Add('Module switcher must contain exactly 12 primary modules')
}
$globalModuleMenu = Get-Content (Join-Path $OutputRoot 'global-module-menu.js') -Raw -Encoding utf8
foreach ($module in $primaryModules) {
  if ($globalModuleMenu -notmatch [regex]::Escape($module)) { $failed.Add("Global module menu is missing module: $module") }
}
foreach ($accessibilityMarker in @('aria-expanded', "event.key !== 'Tab'", "document.body.style.overflow = 'hidden'")) {
  if ($globalModuleMenu -notmatch [regex]::Escape($accessibilityMarker)) {
    $failed.Add("Global module menu accessibility contract is missing: $accessibilityMarker")
  }
}

$login = Get-Content (Join-Path $OutputRoot 'login.html') -Raw -Encoding utf8
if ($login -notmatch "location\.replace\('home\.html'\)") { $failed.Add('Login does not route to the legacy home page') }

$accountSettings = Get-Content (Join-Path $OutputRoot 'account-settings.html') -Raw -Encoding utf8
if ($accountSettings -notmatch 'auth\.signInWithPassword\(') { $failed.Add('Password change flow does not re-authenticate the current password') }
if ($accountSettings -match 'currentPassword\s*:') { $failed.Add('Password change flow uses unsupported currentPassword attribute') }

$reports = Get-Content (Join-Path $OutputRoot 'reports.html') -Raw -Encoding utf8
foreach ($reportContract in @('dateFrom', 'dateTo', 'reportData', 'thisMonth', "camera-center.html#camera-locations-map.html", "risk:'risk-areas.html'", "people:'risk-persons.html'", "vehicle:'vehicle-alerts.html'")) {
  if ($reports -notmatch [regex]::Escape($reportContract)) { $failed.Add("Report filter/export contract is missing: $reportContract") }
}

$authGuard = Get-Content (Join-Path $OutputRoot 'auth-guard.js') -Raw -Encoding utf8
if ($authGuard -match 'loadCommandShell|command-center-v2\.html#') { $failed.Add('Legacy modules still contain redesigned command-center routing') }
if ($authGuard -notmatch 'runtime-health\.js') { $failed.Add('Runtime health monitor is not loaded by auth guard') }
foreach ($securityContract in @(
  '30 * 60 * 1000',
  "login.html?error=idle",
  '!profile.active',
  'applyRolePermissions',
  'hideMutationControls',
  "['ADMIN', 'OFFICER'].includes"
)) {
  if ($authGuard -notmatch [regex]::Escape($securityContract)) {
    $failed.Add("Authentication and role security contract is missing: $securityContract")
  }
}
$adminConsole = Get-Content (Join-Path $OutputRoot 'admin-console.html') -Raw -Encoding utf8
if ($adminConsole -notmatch "profile\.role\s*!==\s*'ADMIN'.*location\.replace\('home\.html'\)") {
  $failed.Add('Admin console does not redirect non-ADMIN users')
}

if ($failed.Count) {
  $failed | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Host "PASS: static page, UTF-8, and camera-center checks completed for $($htmlFiles.Count) HTML pages." -ForegroundColor Green
