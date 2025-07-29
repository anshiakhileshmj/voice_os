
@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    MJAK Automation Complete Build
echo ========================================

echo.
echo [1/6] Cleaning previous builds...
if exist dist rmdir /s /q dist 2>nul
if exist dist-electron rmdir /s /q dist-electron 2>nul
if exist os\dist rmdir /s /q os\dist 2>nul
echo ✓ Cleanup complete

echo.
echo [2/6] Installing Node.js dependencies...
call npm install
if !errorlevel! neq 0 (
    echo ✗ Node.js dependencies installation failed!
    pause
    exit /b 1
)
echo ✓ Node.js dependencies installed

echo.
echo [3/6] Building React application...
call npm run build
if !errorlevel! neq 0 (
    echo ✗ React build failed!
    pause
    exit /b 1
)
echo ✓ React build complete

echo.
echo [4/6] Building Python backend...
cd os
pip install pyinstaller fastapi uvicorn pydantic
if !errorlevel! neq 0 (
    echo ✗ Python dependencies installation failed!
    cd ..
    pause
    exit /b 1
)

if not exist dist mkdir dist
pyinstaller --onefile --name api_server --distpath dist api_server.py
if !errorlevel! neq 0 (
    echo ✗ Python build failed!
    cd ..
    pause
    exit /b 1
)
cd ..
echo ✓ Python backend built

echo.
echo [5/6] Installing Electron dependencies...
call npm install electron electron-builder --save-dev
if !errorlevel! neq 0 (
    echo ✗ Electron installation failed!
    pause
    exit /b 1
)
echo ✓ Electron dependencies installed

echo.
echo [6/6] Building Electron application...
call npx electron-builder --win
if !errorlevel! neq 0 (
    echo ✗ Electron build failed!
    pause
    exit /b 1
)
echo ✓ Electron application built

echo.
echo ========================================
echo         BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Your EXE file is located in: dist-electron\
echo.
pause
