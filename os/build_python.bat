
@echo off
echo Building Python backend...

echo Installing required packages...
pip install pyinstaller fastapi uvicorn pydantic

echo Creating executable...
if not exist dist mkdir dist
pyinstaller --onefile --name api_server --distpath dist api_server.py

if %errorlevel% neq 0 (
    echo Python build failed!
    exit /b 1
)

echo Python build complete!
echo Executable created at: dist\api_server.exe
