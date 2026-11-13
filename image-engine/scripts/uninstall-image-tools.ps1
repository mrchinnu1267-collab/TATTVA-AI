<#
.SYNOPSIS
    TATTVA AI - Uninstall & Rollback Local Image Engine
.DESCRIPTION
    Stops background services and safely removes the Python virtual environment (.venv)
    while preserving configuration and downloaded model weights.
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EngineDir = Resolve-Path (Join-Path $ScriptDir "..")
$VenvDir = Join-Path $EngineDir ".venv"
$StopScript = Join-Path $ScriptDir "stop-image-engine.ps1"

Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "         TATTVA AI - LOCAL IMAGE ENGINE UNINSTALL         " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow

# Step 1: Stop engine if running
if (Test-Path $StopScript) {
    & $StopScript
}

# Step 2: Remove virtual environment
if (Test-Path $VenvDir) {
    Write-Host "Removing virtual environment at $VenvDir..." -ForegroundColor Cyan
    Remove-Item -Path $VenvDir -Recurse -Force
    Write-Host "Virtual environment removed successfully." -ForegroundColor Green
} else {
    Write-Host "No virtual environment found." -ForegroundColor Gray
}

# Step 3: Remove transient runtime logs
$LogFiles = @("engine.pid", "engine-runtime.log", "install.log")
foreach ($Log in $LogFiles) {
    $Target = Join-Path $EngineDir $Log
    if (Test-Path $Target) {
        Remove-Item -Path $Target -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`nUninstallation complete. Note: Downloaded models in models/ were preserved." -ForegroundColor Green

