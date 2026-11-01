@echo off
title TATTVA AI - Local Diffusion Image Engine
cd /d "%~dp0"
echo ========================================================
echo   Starting TATTVA AI Local Image Engine (RTX CUDA)
echo ========================================================
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" server.py
) else (
    python server.py
)
pause
