@echo off
rem DEPLOY the booking site (app.dpsdair.ca) to Cloudflare.
rem Double-click this file. Pushing to GitHub does NOT publish the site —
rem nothing goes live until this runs.
rem
rem First time only: a browser opens asking you to authorise Cloudflare.
rem After that it just deploys.
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo Node.js is not installed on this machine.
  echo Install it from https://nodejs.org  ^(the "LTS" button^), then
  echo double-click this file again.
  echo.
  pause
  exit /b 1
)

echo.
echo === 1/3  Installing dependencies (quick after the first run) ===
call npm install
if errorlevel 1 goto failed

echo.
echo === 2/3  Checking the code compiles ===
call npx tsc --noEmit -p tsconfig.json
if errorlevel 1 (
  echo.
  echo The code did not compile - NOTHING was deployed, the live site is
  echo untouched. Send the red text above to Claude.
  echo.
  pause
  exit /b 1
)

echo.
echo === 3/3  Publishing to Cloudflare ===
call npm run deploy
if errorlevel 1 goto failed

echo.
echo ============================================================
echo  DONE - the site is live.
echo.
echo  Now open the sales app, go to the leads page, and press
echo  "Import new virtual estimates". Web estimate requests
echo  (Gilbert included) will appear in the list.
echo ============================================================
echo.
pause
exit /b 0

:failed
echo.
echo Deploy FAILED - see the message above. The live site is unchanged.
echo If it mentions logging in, run:  npx wrangler login
echo.
pause
exit /b 1
