
@echo off
echo Starting MJAK Automation in development mode...

echo Starting React dev server and Electron...
start cmd /k "npm run dev"
timeout /t 5 /nobreak
start cmd /k "npm run electron"

echo Development environment started!
echo React dev server: http://localhost:8080
echo Electron app should open automatically
pause
