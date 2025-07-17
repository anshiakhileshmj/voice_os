
@echo off
echo Building Python backend...
pip install pyinstaller
pyinstaller --onefile --name api_server api_server.py
echo Python build complete!
