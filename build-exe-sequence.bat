
@echo off
echo Starting EXE build sequence...
echo.

REM Execute the complete build process
call build-complete.bat

echo.
echo Build sequence completed!
echo Check dist-electron folder for your EXE file.
pause
