<#
.SYNOPSIS
    TATTVA AI - Update Image Engine Dependencies
.DESCRIPTION
    Checks and safely updates pinned dependencies within semantic version boundaries.
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EngineDir = Resolve-Path (Join-Path $ScriptDir "..")
$VenvPip = Join-Path $EngineDir ".venv\Scripts\pip.exe"
$ReqFile = Join-Path $EngineDir "requirements.txt"

if (-not (Test-Path $VenvPip)) {
    Write-Host "Error: Virtual environment not found. Run install-image-tools.ps1 first." -ForegroundColor Red
    exit 1
}

Write-Host "Checking for safe dependency updates in TATTVA Image Engine..." -ForegroundColor Cyan

# Update dependencies adhering to requirements.txt
& $VenvPip install --upgrade -r $ReqFile

Write-Host "`nDependency update check complete." -ForegroundColor Green

