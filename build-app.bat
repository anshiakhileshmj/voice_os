
@echo off
echo Building MJAK Automation App...

echo Step 1: Installing dependencies...
call npm install

echo Step 2: Building React frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Frontend build failed!
    exit /b 1
)

echo Step 3: Installing Python dependencies...
cd os
call pip install -r requirements_full.txt
if %errorlevel% neq 0 (
    echo Python dependencies installation failed!
    exit /b 1
)
cd ..

echo Step 4: Building Electron app...
call npm run dist
if %errorlevel% neq 0 (
    echo Electron build failed!
    exit /b 1
)

echo Build completed successfully!
echo EXE file location: dist-electron\
pause
