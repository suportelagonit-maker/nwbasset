@echo off
set ROOT=%~dp0

echo.
echo Subindo NWB Asset...
echo Backend:  http://127.0.0.1:5000
echo Frontend: http://localhost:5001
echo.

start "NWB Asset Backend" powershell -NoExit -ExecutionPolicy Bypass -File "%ROOT%start-api.ps1"
timeout /t 2 /nobreak >nul
start "NWB Asset Frontend" cmd /k "cd /d ""%ROOT%frontend-web"" && npm run dev"

echo As janelas do backend e frontend foram abertas.
