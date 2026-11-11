@echo off
setlocal
title Jocasta
cd /d "%~dp0"

rem uv installs itself here and VS Code terminals don't always see it
set "PATH=%USERPROFILE%\.local\bin;%PATH%"

where uv >nul 2>&1 || (echo uv is not installed. See README.md & pause & exit /b 1)
where npm >nul 2>&1 || (echo Node.js is not installed. See README.md & pause & exit /b 1)

echo [1/4] Getting the api ready...
pushd api
uv sync --quiet || (echo uv sync failed & popd & pause & exit /b 1)
uv run python -m jocasta.seed
popd

echo [2/4] Getting the dashboard ready...
pushd web
call npm install --no-audit --no-fund --loglevel=error || (echo npm install failed & popd & pause & exit /b 1)
popd

echo [3/4] Starting both...
start "Jocasta api" /min cmd /k "cd /d "%~dp0api" && uv run uvicorn jocasta.app:app --host 127.0.0.1 --port 8000"
start "Jocasta web" /min cmd /k "cd /d "%~dp0web" && npm run dev -- --port 5173 --strictPort"

echo [4/4] Waiting for the dashboard...
for /l %%i in (1,1,60) do (
  curl -s -o nul http://localhost:5173 && goto ready
  timeout /t 1 /nobreak >nul
)
echo The dashboard didn't start. Check the "Jocasta web" window.
pause
exit /b 1

:ready
start "" http://localhost:5173
echo Jocasta is running. Close the two minimised windows to stop it.
timeout /t 5 >nul
