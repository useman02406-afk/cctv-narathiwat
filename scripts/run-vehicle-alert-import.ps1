[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
  [string]$XlsxPath,
  [ValidateScript({ [string]::IsNullOrWhiteSpace($_) -or (Test-Path -LiteralPath $_ -PathType Leaf) })]
  [string]$PptxPath,
  [switch]$Apply
)

$arguments = @("$PSScriptRoot\import-vehicle-alerts.py", "--xlsx", $XlsxPath)
if ($PptxPath) { $arguments += @("--pptx", $PptxPath) }

$pythonExe = $null
$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCommand) { $pythonExe = $pythonCommand.Source }

if (-not $pythonExe) {
  $bundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
  if (Test-Path -LiteralPath $bundledPython -PathType Leaf) { $pythonExe = $bundledPython }
}

if (-not $pythonExe) {
  throw "Python 3 was not found. Install Python 3 or add it to PATH, then run this script again."
}

function Invoke-VehicleImporter {
  param([string[]]$ImporterArguments)
  & $pythonExe @ImporterArguments
  return $LASTEXITCODE
}

if (-not $Apply) {
  $exitCode = Invoke-VehicleImporter $arguments
  exit $exitCode
}

$secret = Read-Host "Paste Supabase service_role key (hidden; not saved)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $applyArguments = @($arguments) + @("--apply")
  $exitCode = Invoke-VehicleImporter $applyArguments
  if ($exitCode -ne 0) { throw "Vehicle alert importer stopped with exit code $exitCode." }
}
finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}
