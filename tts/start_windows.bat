
@echo off
echo === Coqui TTS Server Setup for Windows ===
echo.

cd /d "%~dp0"

echo Installing Python requirements...
python -m pip install -r requirements.txt

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to install requirements.
    echo Please make sure Python is installed and added to PATH.
    pause
    exit /b 1
)

echo.
echo Starting TTS server...
echo Server will run on http://localhost:5001
echo Press Ctrl+C to stop the server
echo.

python tts_server.py

pause
