
@echo off
echo Building MJAK Desktop Application with Python Server...

REM Build the React app
echo Building React application...
npm run build
if %errorlevel% neq 0 (
    echo React build failed!
    exit /b 1
)

REM Copy Python server files
echo Copying Python server files...
if not exist "dist\os" mkdir "dist\os"
xcopy "os\*" "dist\os\" /E /I /Y

REM Build Electron app
echo Building Electron application...
npm run electron:build
if %errorlevel% neq 0 (
    echo Electron build failed!
    exit /b 1
)

echo Build complete!
echo The executable will automatically start the Python automation server.
echo Users can toggle automation with the power switch in the app.
pause
