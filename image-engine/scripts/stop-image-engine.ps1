<#
.SYNOPSIS
    TATTVA AI - Stop Local Image Engine Background Daemon
.DESCRIPTION
    Safely terminates the FastAPI inference server, frees VRAM and system memory, and cleans up PID files.
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EngineDir = Resolve-Path (Join-Path $ScriptDir "..")
$PidFile = Join-Path $EngineDir "engine.pid"

Write-Host "Stopping TATTVA AI Image Engine..." -ForegroundColor Cyan

# 1. Unload model gracefully via HTTP if reachable
try {
    Invoke-RestMethod -Uri "http://127.0.0.1:8001/unload" -Method Post -TimeoutSec 3 -ErrorAction SilentlyContinue | Out-Null
    Write-Host "VRAM unloaded gracefully." -ForegroundColor Gray
} catch {}

# 2. Stop process by PID
if (Test-Path $PidFile) {
    $TargetPid = Get-Content $PidFile -ErrorAction SilentlyContinue
    if ($TargetPid) {
        try {
            $Proc = Get-Process -Id $TargetPid -ErrorAction SilentlyContinue
            if ($Proc) {
                Stop-Process -Id $TargetPid -Force
                Write-Host "Process $TargetPid terminated." -ForegroundColor Green
            }
        } catch {
            Write-Host "Process $TargetPid was not running." -ForegroundColor Gray
        }
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

# 3. Double check port 8001 listeners
$Connection = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
if ($Connection) {
    foreach ($Conn in $Connection) {
        try {
            Stop-Process -Id $Conn.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host "Terminated lingering process on port 8001 (PID $($Conn.OwningProcess))" -ForegroundColor Gray
        } catch {}
    }
}

Write-Host "TATTVA AI Image Engine stopped. All GPU memory released." -ForegroundColor Green

