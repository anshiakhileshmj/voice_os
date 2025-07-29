@echo off
echo ========================================
echo    MJAK Automation Debug Build
echo ========================================

echo.
echo [DEBUG] Checking environment...
echo Node version:
node --version
echo NPM version:
npm --version
echo Python version:
python --version

echo.
echo [DEBUG] Checking project structure...
if exist "src\main.tsx" (
    echo ✓ src\main.tsx found
) else (
    echo ✗ src\main.tsx missing
)

if exist "electron\main.cjs" (
    echo ✓ electron\main.cjs found
) else (
    echo ✗ electron\main.cjs missing
)

if exist "package.json" (
    echo ✓ package.json found
) else (
    echo ✗ package.json missing
)

echo.
echo [DEBUG] Building with verbose output...
set NODE_ENV=production
set DEBUG=electron-builder

echo.
echo [1] Installing dependencies...
call npm install --verbose

echo.
echo [2] Building React app...
call npm run build:prod
if %errorlevel% neq 0 (
    echo ✗ React build failed!
    echo Checking for common issues...
    if not exist "dist" (
        echo - dist folder not created
    )
    if not exist "dist\index.html" (
        echo - index.html not generated
    )
    pause
    exit /b 1
)

echo.
echo [3] Verifying build output...
dir dist
if not exist "dist\index.html" (
    echo ✗ Build verification failed!
    pause
    exit /b 1
)

echo.
echo [4] Building Python backend...
cd os
call pip install pyinstaller
call pyinstaller --onefile --name api_server --distpath dist api_server.py
cd ..

echo.
echo [5] Building Electron app with debug...
call npx electron-builder --win --publish=never
if %errorlevel% neq 0 (
    echo ✗ Electron build failed!
    echo Check the output above for specific errors
    pause
    exit /b 1
)

echo.
echo ========================================
echo         DEBUG BUILD COMPLETED!
echo ========================================
echo.
echo Check dist-electron folder for your EXE file.
echo If issues persist, check the console output above.
echo.
pause