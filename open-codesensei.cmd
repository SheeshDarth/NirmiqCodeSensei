@echo off
REM ---------------------------------------------------------------------------
REM  NirmiqCodeSensei — double-click launcher (daily use)
REM
REM  Builds the production app once, opens the dashboard in your browser, then
REM  serves it on 127.0.0.1:3000. Use this instead of `npm run dev` when you
REM  want to *use* the tool (faster, no per-navigation recompile) rather than
REM  edit it. All data stays local in data\nirmiqcodesensei.db — zero telemetry.
REM
REM  For editing the tool itself, use `npm run dev` instead.
REM ---------------------------------------------------------------------------
cd /d "%~dp0"

echo.
echo   Building NirmiqCodeSensei (production)...
echo.
call npm run build
if errorlevel 1 (
  echo.
  echo   Build failed - see the errors above. Not starting the server.
  pause
  exit /b 1
)

echo.
echo   Dashboard - http://127.0.0.1:3000/dashboard
echo   Data      - %CD%\data
echo   Privacy   - All data stays local. Zero telemetry.
echo.

REM Give the server a moment to boot, then open the browser (non-blocking).
start "" /min cmd /c "timeout /t 4 >nul & start "" http://127.0.0.1:3000/dashboard"

call npm run start
