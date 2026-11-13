<#
.SYNOPSIS
    TATTVA AI - Stage A: Core Engine & PyTorch CUDA Setup
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EngineDir = Resolve-Path (Join-Path $ScriptDir "..")
$VenvDir = Join-Path $EngineDir ".venv"
$Python311 = "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
$LogFile = Join-Path $EngineDir "stage-a-install.log"

function Log-Step([string]$Msg) {
    $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[$ts] $Msg"
    Write-Host $line -ForegroundColor Cyan
    Add-Content -Path $LogFile -Value $line
}

"=== TATTVA AI STAGE A INSTALLATION ===" | Out-File -FilePath $LogFile -Encoding utf8

Log-Step "Verifying Python 3.11 binary at $Python311..."
if (-not (Test-Path $Python311)) {
    throw "Python 3.11 not found at $Python311"
}
$pyVer = & $Python311 --version
Log-Step "Detected: $pyVer"

# 1. Virtual Environment
if (-not (Test-Path $VenvDir)) {
    Log-Step "Creating isolated virtual environment at $VenvDir..."
    & $Python311 -m venv $VenvDir
}
$VenvPy = Join-Path $VenvDir "Scripts\python.exe"
$VenvPip = Join-Path $VenvDir "Scripts\pip.exe"

Log-Step "Upgrading pip, setuptools, wheel..."
& $VenvPy -m pip install --upgrade pip setuptools wheel --no-warn-script-location | Out-File -Append $LogFile

# 2. PyTorch CUDA 12.1 Wheels
Log-Step "Installing PyTorch 2.5.1 with CUDA 12.1..."
& $VenvPy -m pip install torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 `
    --index-url https://download.pytorch.org/whl/cu121 `
    --no-warn-script-location

# 3. Verify CUDA
Log-Step "Verifying PyTorch CUDA acceleration on RTX 3050..."
$cudaScript = @'
import torch
dev_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None'
dev_cap = torch.cuda.get_device_capability(0) if torch.cuda.is_available() else 'None'
print(f'CUDA_AVAILABLE={torch.cuda.is_available()}; DEVICE={dev_name}; CAPABILITY={dev_cap}')
'@
$cudaOut = & $VenvPy -c $cudaScript
Log-Step "CUDA Status: $cudaOut"

# 4. Diffusers, Transformers, Accelerate, Safetensors
Log-Step "Installing Diffusers, Accelerate, Transformers, Safetensors..."
& $VenvPy -m pip install "diffusers>=0.31,<0.35" "transformers>=4.44,<4.50" "accelerate>=1.0,<1.3" "safetensors>=0.4,<0.6" "huggingface_hub>=0.26,<0.36" "sentencepiece>=0.2,<0.3" "protobuf>=5.27,<6" --no-warn-script-location

# 5. FastAPI, Uvicorn, Pillow
Log-Step "Installing FastAPI, Uvicorn, Pydantic, Pillow, OpenCV-Headless..."
& $VenvPy -m pip install "fastapi>=0.115,<0.117" "uvicorn[standard]>=0.32,<0.35" "pydantic>=2.9,<3" "pillow>=10.4,<12" "opencv-python-headless>=4.10.0" --no-warn-script-location

Log-Step "Stage A installation complete!"
