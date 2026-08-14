<#
Safely imports warrant-person photos into Supabase Storage and links them to
risk_person_records. The service role key is prompted as hidden input and is
kept only in this PowerShell process.

Run without -Apply first to check the matches. Use -Apply only after the dry
run reports the expected matches.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
  [string]$ZipPath,
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$importer = Join-Path $PSScriptRoot 'upload-risk-person-photos.mjs'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  throw 'Node.js was not found. Install Node.js LTS, then run this script again.'
}
$node = $nodeCommand.Source

$secureKey = Read-Host 'Paste Supabase service_role key (hidden; not saved)' -AsSecureString
$bstr = [IntPtr]::Zero
$plainKey = $null
$extractDir = Join-Path ([System.IO.Path]::GetTempPath()) ("warrant-photo-import-" + [Guid]::NewGuid().ToString('N'))

try {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
  $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $env:SUPABASE_SERVICE_ROLE_KEY = $plainKey

  New-Item -ItemType Directory -Path $extractDir | Out-Null
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $extractDir -Force

  $arguments = @($importer, $extractDir)
  if ($Apply) { $arguments += '--apply' }
  & $node @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Photo importer stopped with exit code $LASTEXITCODE."
  }

  if ($Apply) {
    Write-Host 'Import completed: photos were uploaded and linked.' -ForegroundColor Green
  } else {
    Write-Host 'Dry run completed. If the match count is correct, rerun with -Apply.' -ForegroundColor Yellow
  }
}
finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  if (Test-Path -LiteralPath $extractDir) { Remove-Item -LiteralPath $extractDir -Recurse -Force }
}
