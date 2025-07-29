
@echo off
echo Building MJAK Automation App...

echo Step 1: Building React app...
call npm run build

echo Step 2: Building Python backend...
cd os
call build_python.bat
cd ..

echo Step 3: Installing Electron dependencies...
call npm install electron electron-builder --save-dev

echo Step 4: Building Electron app...
call npx electron-builder

echo Build complete! Check dist-electron folder for your EXE file.
pause
