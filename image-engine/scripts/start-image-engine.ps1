<#
.SYNOPSIS
    TATTVA AI - Start Local Image Engine Background Daemon
.DESCRIPTION
    Launches FastAPI inference server on 127.0.0.1:8001 and saves process ID.
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EngineDir = Resolve-Path (Join-Path $ScriptDir "..")
$VenvPython = Join-Path $EngineDir ".venv\Scripts\python.exe"
$PidFile = Join-Path $EngineDir "engine.pid"
$LogFile = Join-Path $EngineDir "engine-runtime.log"

if (-not (Test-Path $VenvPython)) {
    Write-Host "Error: Virtual environment not found at $VenvPython. Run install-image-tools.ps1 first." -ForegroundColor Red
    exit 1
}

# Check if already running
if (Test-Path $PidFile) {
    $ExistingPid = Get-Content $PidFile -ErrorAction SilentlyContinue
    if ($ExistingPid -and (Get-Process -Id $ExistingPid -ErrorAction SilentlyContinue)) {
        Write-Host "TATTVA Image Engine is already running (PID: $ExistingPid)" -ForegroundColor Yellow
        exit 0
    } else {
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Starting TATTVA AI Image Engine Daemon on http://127.0.0.1:8001..." -ForegroundColor Cyan

# Start process in background
$ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
$ProcessInfo.FileName = $VenvPython
$ProcessInfo.Arguments = "main.py"
$ProcessInfo.WorkingDirectory = $EngineDir
$ProcessInfo.RedirectStandardOutput = $true
$ProcessInfo.RedirectStandardError = $true
$ProcessInfo.UseShellExecute = $false
$ProcessInfo.CreateNoWindow = $true

$Process = New-Object System.Diagnostics.Process
$Process.StartInfo = $ProcessInfo

if ($Process.Start()) {
    $Process.Id | Out-File -FilePath $PidFile -Encoding utf8
    Write-Host "Process spawned with PID $($Process.Id). Awaiting readiness..." -ForegroundColor Gray

    # Poll health endpoint
    $MaxRetries = 25
    $Ready = $false
    for ($i = 0; $i -lt $MaxRetries; $i++) {
        Start-Sleep -Milliseconds 800
        try {
            $response = Invoke-RestMethod -Uri "http://127.0.0.1:8001/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
            if ($response.status -eq "ok" -or $response.device) {
                $Ready = $true
                break
            }
        } catch {
            # Still booting
        }
    }

    if ($Ready) {
        Write-Host "TATTVA AI Local Image Engine is LIVE on http://127.0.0.1:8001 (PID: $($Process.Id))" -ForegroundColor Green
    } else {
        Write-Host "Warning: Engine started (PID: $($Process.Id)) but health check timed out. Check $LogFile" -ForegroundColor Yellow
    }
} else {
    Write-Host "Failed to launch Python process." -ForegroundColor Red
    exit 1
}

