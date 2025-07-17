
@echo off
echo Installing Python dependencies for MJAK Automation...

echo Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH!
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo Installing pip dependencies...
pip install --upgrade pip
pip install -r requirements_full.txt

echo Installing operate package...
pip install -e .

echo Dependencies installed successfully!
pause
