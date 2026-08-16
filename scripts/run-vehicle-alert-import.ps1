[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
  [string]$XlsxPath,
  [ValidateScript({ [string]::IsNullOrWhiteSpace($_) -or (Test-Path -LiteralPath $_ -PathType Leaf) })]
  [string]$PptxPath,
  [string]$CreatedBy,
  [switch]$Apply
)

$arguments = @("$PSScriptRoot\import-vehicle-alerts.py", "--xlsx", $XlsxPath)
if ($PptxPath) { $arguments += @("--pptx", $PptxPath) }
if ($CreatedBy) { $arguments += @("--created-by", $CreatedBy) }

$pythonExe = $null
$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCommand -and $pythonCommand.Source -and
    $pythonCommand.Source -notmatch '\\WindowsApps\\' -and
    (Test-Path -LiteralPath $pythonCommand.Source -PathType Leaf)) {
  # Do not use the Microsoft Store app-execution alias. It reports that Python
  # is missing even when the bundled Codex runtime is available.
  $pythonExe = $pythonCommand.Source
}

if (-not $pythonExe) {
  $bundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
  if (Test-Path -LiteralPath $bundledPython -PathType Leaf) { $pythonExe = $bundledPython }
}

if (-not $pythonExe) {
  $runtimeRoot = Join-Path $env:USERPROFILE ".cache\codex-runtimes"
  $runtimePython = Get-ChildItem -LiteralPath $runtimeRoot -Filter python.exe -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\Lib\\venv\\' } |
    Select-Object -First 1 -ExpandProperty FullName
  if ($runtimePython) { $pythonExe = $runtimePython }
}

if (-not $pythonExe) {
  throw "Python 3 was not found. The Codex bundled runtime was not found either. Install Python 3 or restore the Codex runtime, then run this script again."
}

Write-Host "Using Python runtime: $pythonExe"

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
