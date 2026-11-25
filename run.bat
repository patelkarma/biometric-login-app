@echo off
REM SecureID - one-command start for Windows.
REM Builds the React app, bundles it into Spring Boot and starts everything on http://localhost:8080
setlocal
cd /d "%~dp0"

where java >nul 2>nul || (echo [ERROR] Java 17 or newer is required: https://adoptium.net & pause & exit /b 1)
where npm  >nul 2>nul || (echo [ERROR] Node.js 20 or newer is required: https://nodejs.org & pause & exit /b 1)

echo.
echo [1/3] Installing frontend dependencies...
pushd frontend
call npm install --no-audit --no-fund || (popd & pause & exit /b 1)

echo.
echo [2/3] Building frontend...
call npm run build || (popd & pause & exit /b 1)
popd

if exist backend\src\main\resources\static rmdir /s /q backend\src\main\resources\static
xcopy /e /i /q frontend\dist backend\src\main\resources\static >nul

echo.
echo [3/3] Starting the app (first run downloads Maven dependencies, ~1-2 min)...
echo.
echo     When you see "Started BackendApplication", open:  http://localhost:8080
echo     6-digit codes are shown on screen and printed in this window.
echo.
cd backend
call mvnw.cmd -q spring-boot:run
pause
