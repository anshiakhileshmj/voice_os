
@echo off
echo Cleaning up duplicate electron files...

cd electron
if exist main.js del main.js
if exist preload.js del preload.js
cd ..

echo Cleanup complete!
echo Only main.cjs and preload.cjs should remain in electron folder.
pause
