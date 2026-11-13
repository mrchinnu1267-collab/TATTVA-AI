$installer = "C:\Users\mrchi\AppData\Local\Temp\WinGet\Python.Python.3.11.3.11.9\python-3.11.9-amd64.exe"
$targetDir = "$env:LOCALAPPDATA\Programs\Python\Python311"

Write-Host "Installing Python 3.11 to $targetDir..."
$proc = Start-Process -FilePath $installer -ArgumentList "/quiet", "InstallAllUsers=0", "Include_launcher=0", "Include_test=0", "PrependPath=1", "TargetDir=$targetDir" -Wait -PassThru
Write-Host "ExitCode: $($proc.ExitCode)"

if (Test-Path "$targetDir\python.exe") {
    Write-Host "Python 3.11 installed successfully at $targetDir\python.exe"
    & "$targetDir\python.exe" --version
} else {
    Write-Host "Target python.exe not found."
}
