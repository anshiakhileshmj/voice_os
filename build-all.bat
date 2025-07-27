
@echo off
echo Building MJAK Automation App...

echo Step 1: Building React app...
call npm run build
if %errorlevel% neq 0 (
    echo React build failed!
    pause
    exit /b 1
)

echo Step 2: Building Python backend...
cd os
if not exist dist mkdir dist
call build_python.bat
if %errorlevel% neq 0 (
    echo Python build failed!
    cd ..
    pause
    exit /b 1
)
cd ..

echo Step 3: Installing Electron dependencies...
if not exist node_modules\electron (
    call npm install electron electron-builder --save-dev
    if %errorlevel% neq 0 (
        echo Electron dependencies installation failed!
        pause
        exit /b 1
    )
)

echo Step 4: Building Electron app...
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo Electron build failed!
    pause
    exit /b 1
)

echo Build complete! Check dist-electron folder for your EXE file.
pause
