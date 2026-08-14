<#
Safely imports warrant-person photos into Supabase Storage and links them to
risk_person_records. The service role key is prompted as hidden input and is
kept only in this PowerShell process.

Examples:
  .\scripts\run-risk-person-photo-import.ps1 -ZipPath "C:\path\บุคคลตามหมายจับ.zip"
  .\scripts\run-risk-person-photo-import.ps1 -ZipPath "C:\path\บุคคลตามหมายจับ.zip" -Apply

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
$repoRoot = Split-Path -Parent $PSScriptRoot
$importer = Join-Path $PSScriptRoot 'upload-risk-person-photos.mjs'
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  throw 'ไม่พบ Node.js: ติดตั้ง Node.js LTS ก่อน แล้วจึงเรียกสคริปต์นี้อีกครั้ง'
}

$secureKey = Read-Host 'วาง Supabase service_role key (จะไม่แสดงและไม่ถูกบันทึก)' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
$plainKey = $null
$extractDir = Join-Path ([System.IO.Path]::GetTempPath()) ("warrant-photo-import-" + [Guid]::NewGuid().ToString('N'))

try {
  $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $env:SUPABASE_SERVICE_ROLE_KEY = $plainKey

  New-Item -ItemType Directory -Path $extractDir | Out-Null
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $extractDir -Force

  $arguments = @($importer, $extractDir)
  if ($Apply) { $arguments += '--apply' }
  & $node @arguments
  if ($LASTEXITCODE -ne 0) { throw "ตัวนำเข้าหยุดทำงาน (exit code $LASTEXITCODE)" }

  if ($Apply) {
    Write-Host 'นำเข้ารูปและเชื่อมข้อมูลเสร็จแล้ว' -ForegroundColor Green
  } else {
    Write-Host 'ตรวจสอบแบบ dry run เสร็จแล้ว — หากยอดตรงตามต้องการ ให้รันอีกครั้งพร้อม -Apply' -ForegroundColor Yellow
  }
}
finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  if (Test-Path -LiteralPath $extractDir) { Remove-Item -LiteralPath $extractDir -Recurse -Force }
}
