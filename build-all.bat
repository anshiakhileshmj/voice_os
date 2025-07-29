
@echo off
echo Building MJAK Automation App...

echo Step 1: Cleaning previous builds...
if exist dist rmdir /s /q dist
if exist dist-electron rmdir /s /q dist-electron
if exist os\dist rmdir /s /q os\dist

echo Step 2: Building React app...
call npm run build
if %errorlevel% neq 0 (
    echo React build failed!
    pause
    exit /b 1
)

echo Step 3: Building Python backend...
cd os
call pip install pyinstaller
if %errorlevel% neq 0 (
    echo PyInstaller installation failed!
    cd ..
    pause
    exit /b 1
)

call pyinstaller --onefile --name api_server --distpath dist api_server.py
if %errorlevel% neq 0 (
    echo Python build failed!
    cd ..
    pause
    exit /b 1
)
cd ..

echo Step 4: Installing Electron dependencies...
call npm install electron electron-builder --save-dev
if %errorlevel% neq 0 (
    echo Electron installation failed!
    pause
    exit /b 1
)

echo Step 5: Building Electron app...
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo Electron build failed!
    pause
    exit /b 1
)

echo Build complete! Check dist-electron folder for your EXE file.
pause
