
@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    MJAK Automation Complete Build
echo ========================================

echo.
echo [1/7] Cleaning previous builds...
if exist dist rmdir /s /q dist 2>nul
if exist dist-electron rmdir /s /q dist-electron 2>nul
if exist os\dist rmdir /s /q os\dist 2>nul

REM Clean up duplicate electron files
echo Cleaning electron folder...
cd electron
if exist main.js del main.js 2>nul
if exist preload.js del preload.js 2>nul
cd ..

echo ✓ Cleanup complete

echo.
echo [2/7] Installing Node.js dependencies...
call npm install
if !errorlevel! neq 0 (
    echo ✗ Node.js dependencies installation failed!
    pause
    exit /b 1
)
echo ✓ Node.js dependencies installed

echo.
echo [3/7] Building React application...
set NODE_ENV=production
call npm run build
if !errorlevel! neq 0 (
    echo ✗ React build failed!
    pause
    exit /b 1
)
echo ✓ React build complete

echo.
echo [3.5/7] Verifying React build...
if not exist "dist\index.html" (
    echo ✗ React build verification failed - index.html not found!
    pause
    exit /b 1
)
echo ✓ React build verified

echo.
echo [4/7] Building Python backend...
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
echo [5/7] Installing Electron dependencies...
call npm install electron electron-builder --save-dev
if !errorlevel! neq 0 (
    echo ✗ Electron installation failed!
    pause
    exit /b 1
)
echo ✓ Electron dependencies installed

echo.
echo [6/7] Verifying Electron files...
if not exist "electron\main.cjs" (
    echo ✗ electron\main.cjs not found!
    pause
    exit /b 1
)
if not exist "electron\preload.cjs" (
    echo ✗ electron\preload.cjs not found!
    pause
    exit /b 1
)
if not exist "dist\index.html" (
    echo ✗ dist\index.html not found!
    pause
    exit /b 1
)
echo ✓ Electron files verified

echo.
echo [7/7] Building Electron application...
set NODE_ENV=production
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
