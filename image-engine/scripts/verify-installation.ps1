<#
.SYNOPSIS
    TATTVA AI - Image Tools Installation Verification & Health Check
.DESCRIPTION
    Validates Python environment, PyTorch CUDA tensor acceleration, Diffusers pipelines,
    and engine configuration.
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EngineDir = Resolve-Path (Join-Path $ScriptDir "..")
$VenvPython = Join-Path $EngineDir ".venv\Scripts\python.exe"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       TATTVA AI - IMAGE ENGINE VERIFICATION SUITE       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$Passed = 0
$Failed = 0

function Assert-Check([string]$Description, [scriptblock]$TestBlock) {
    Write-Host -NoNewline "[CHECK] $Description ... "
    try {
        $result = & $TestBlock
        if ($result -eq $false) {
            Write-Host "FAILED" -ForegroundColor Red
            $script:Failed++
        } else {
            Write-Host "PASSED" -ForegroundColor Green
            if ($result -is [string] -and $result) {
                Write-Host "        Detail: $result" -ForegroundColor Gray
            }
            $script:Passed++
        }
    } catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
        $script:Failed++
    }
}

# Check 1: Virtual environment exists
Assert-Check "Python Virtual Environment Present" {
    if (-not (Test-Path $VenvPython)) {
        throw "Missing .venv at $VenvPython"
    }
    return $true
}

# Check 2: PyTorch and CUDA
Assert-Check "PyTorch CUDA Hardware Acceleration" {
    $script = "import torch; assert torch.cuda.is_available(), 'CUDA not available'; print(f'{torch.__version__} on {torch.cuda.get_device_name(0)}') "
    $output = & $VenvPython -c $script 2>&1
    if ($LASTEXITCODE -ne 0) { throw $output }
    return $output
}

# Check 3: Diffusers and Transformers
Assert-Check "Diffusers & Hugging Face Libraries" {
    $script = "import diffusers, transformers, accelerate, safetensors; print(f'diffusers={diffusers.__version__}, transformers={transformers.__version__}')"
    $output = & $VenvPython -c $script 2>&1
    if ($LASTEXITCODE -ne 0) { throw $output }
    return $output
}

# Check 4: FastAPI and Server Stack
Assert-Check "FastAPI, Uvicorn & PIL Server Stack" {
    $script = "import fastapi, uvicorn, pydantic, PIL; print(f'fastapi={fastapi.__version__}, PIL={PIL.__version__}')"
    $output = & $VenvPython -c $script 2>&1
    if ($LASTEXITCODE -ne 0) { throw $output }
    return $output
}

# Check 5: Configuration File Validity
Assert-Check "Engine Configuration File (config.json)" {
    $ConfigFile = Join-Path $EngineDir "config.json"
    if (-not (Test-Path $ConfigFile)) { throw "config.json not found" }
    $content = Get-Content $ConfigFile -Raw | ConvertFrom-Json
    if (-not $content.models -or -not $content.server) { throw "Invalid config structure" }
    return "Port: $($content.server.port), Default Model: $($content.default_model)"
}

# Check 6: Port 8001 Availability
Assert-Check "Port 8001 Binding Availability" {
    $listener = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
    if ($listener) {
        return "Port 8001 in use (Service might already be running, PID: $($listener[0].OwningProcess))"
    }
    return "Port 8001 is open and ready"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Verification Finished: $Passed Passed, $Failed Failed" -ForegroundColor ($Failed -eq 0 ? "Green" : "Red")
Write-Host "==========================================================" -ForegroundColor Cyan

if ($Failed -gt 0) {
    exit 1
}
exit 0

