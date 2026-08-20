@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo   Manor Lords - Build Public game-data.js
echo ==========================================
echo.
cscript.exe //nologo "tools\build_public_js.js"
set ERR=%ERRORLEVEL%
echo.
if not "%ERR%"=="0" (
    echo BUILD FAILED. No public file should be committed until the error is fixed.
    pause
    exit /b %ERR%
)
echo Build complete.
echo Test the planners, then commit data\game-data.js with GitHub Desktop.
pause
