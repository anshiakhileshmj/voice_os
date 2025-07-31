
@echo off
echo Starting MJAK Automation Service...

REM Change to the os directory
cd /d "%~dp0"

echo Installing Python dependencies...
pip install --upgrade pip
pip install -r requirements_full.txt
pip install -e .

echo Starting automation server...
python start_api_server.py

pause
