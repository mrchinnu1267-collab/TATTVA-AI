<#
.SYNOPSIS
    TATTVA AI - Automated Image Tools Installer (Windows 11)
.DESCRIPTION
    Sets up an isolated Python 3.11/3.12 virtual environment for TATTVA AI's local CUDA image engine,
    installs official PyTorch with CUDA 12.1 support, and configures all pinned dependencies.
#>

[CmdletBinding()]
param(
    [switch]$SkipTorchInstall = $false,
    [string]$PythonPath = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EngineDir = Resolve-Path (Join-Path $ScriptDir "..")
$LogFile = Join-Path $EngineDir "install.log"
$VenvDir = Join-Path $EngineDir ".venv"

function Log-Message([string]$Message, [string]$Level = "INFO") {
    $Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $Formatted = "[$Timestamp] [$Level] $Message"
    Write-Host $Formatted
    Add-Content -Path $LogFile -Value $Formatted -ErrorAction SilentlyContinue
}

"=== TATTVA AI Image Engine Installation Started ===" | Out-File -FilePath $LogFile -Encoding utf8

Log-Message "Target engine directory: $EngineDir"

# Step 1: Resolve Python Executable
$PythonCmd = $null
if ($PythonPath -and (Test-Path $PythonPath)) {
    $PythonCmd = $PythonPath
    Log-Message "Using user-specified Python: $PythonCmd"
} else {
    # Check for direct python.exe (excluding Windows Store stubs)
    $CandidatePythons = @(
        "C:\Users\$env:USERNAME\AppData\Local\Programs\Python\Python311\python.exe",
        "C:\Users\$env:USERNAME\AppData\Local\Programs\Python\Python310\python.exe",
        "C:\Users\$env:USERNAME\AppData\Local\Programs\Python\Python312\python.exe",
        "C:\Program Files\Python311\python.exe",
        "C:\Program Files\Python310\python.exe",
        "C:\Program Files\Python312\python.exe"
    )

    foreach ($Candidate in $CandidatePythons) {
        if (Test-Path $Candidate) {
            $PythonCmd = $Candidate
            Log-Message "Found standalone Python installation: $PythonCmd"
            break
        }
    }

    if (-not $PythonCmd) {
        # Check if python or py works and is not the store redirect
        $TestOutput = & py -3.11 --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $PythonCmd = "py -3.11"
            Log-Message "Using Windows py launcher with Python 3.11"
        }
    }
}

if (-not $PythonCmd) {
    Log-Message "No standalone Python 3.10-3.12 found. Checking winget..." "WARN"
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Log-Message "Installing Python 3.11 via winget (unattended, silent)..."
        try {
            & winget install Python.Python.3.11 --source winget --accept-package-agreements --accept-source-agreements --silent
            $Candidate = "C:\Users\$env:USERNAME\AppData\Local\Programs\Python\Python311\python.exe"
            if (Test-Path $Candidate) {
                $PythonCmd = $Candidate
                Log-Message "Python 3.11 installed successfully at $PythonCmd"
            }
        } catch {
            Log-Message "Winget install failed or needs user approval. Error: $_" "ERROR"
        }
    }
}

if (-not $PythonCmd) {
    Log-Message "Python 3.10-3.12 is required. Please install Python 3.11 from python.org or via winget." "ERROR"
    throw "Python installation not found."
}

# Step 2: Create Isolated Virtual Environment
if (-not (Test-Path $VenvDir)) {
    Log-Message "Creating isolated virtual environment at $VenvDir..."
    if ($PythonCmd -like "py *") {
        $Args = $PythonCmd.Split(" ")
        & $Args[0] $Args[1] -m venv $VenvDir
    } else {
        & $PythonCmd -m venv $VenvDir
    }
    Log-Message "Virtual environment initialized."
} else {
    Log-Message "Existing virtual environment detected at $VenvDir. Preserving."
}

$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$VenvPip = Join-Path $VenvDir "Scripts\pip.exe"

if (-not (Test-Path $VenvPython)) {
    Log-Message "Virtual environment Python executable missing at $VenvPython" "ERROR"
    throw "Virtual environment creation failed."
}

# Step 3: Upgrade Pip
Log-Message "Upgrading pip, setuptools, and wheel in virtual environment..."
& $VenvPython -m pip install --upgrade pip setuptools wheel --no-warn-script-location | Out-File -Append $LogFile

# Step 4: Install PyTorch with CUDA 12.1
if (-not $SkipTorchInstall) {
    Log-Message "Installing PyTorch 2.5.1 with CUDA 12.1 wheels..."
    & $VenvPython -m pip install torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 `
        --index-url https://download.pytorch.org/whl/cu121 `
        --no-warn-script-location
}

# Step 5: Install Requirements
$ReqFile = Join-Path $EngineDir "requirements.txt"
if (Test-Path $ReqFile) {
    Log-Message "Installing pinned image-engine requirements from $ReqFile..."
    & $VenvPython -m pip install -r $ReqFile --no-warn-script-location
}

# Step 6: Verify CUDA Activation
Log-Message "Verifying CUDA availability in isolated environment..."
$CudaCheckScript = "import torch; print(f'PYTORCH={torch.__version__}; CUDA_AVAILABLE={torch.cuda.is_available()}; DEVICE={torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')"
$CudaResult = & $VenvPython -c $CudaCheckScript
Log-Message "Verification output: $CudaResult"

Log-Message "=== TATTVA AI Image Engine Installation Completed Successfully ==="
Write-Host "`nInstallation successful! Run verify-installation.ps1 to execute the verification suite." -ForegroundColor Green

