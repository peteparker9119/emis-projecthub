@echo off
echo Starting EMIS ProjectHub...

cd /d "%~dp0frontend"
start "" http://localhost:5177
npm run dev -- --port 5177

pause
