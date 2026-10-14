 @echo off
setlocal
title Online Retail DWM System - Launcher

echo =======================================================================
echo Online Retail Customer Segmentation and Product Recommendation System
echo Data Warehousing ^& Data Mining Academic Project Launcher
echo =======================================================================
echo.

echo [1/4] Checking required commands...
where python >nul 2>nul
if errorlevel 1 echo WARNING: Python was not found in PATH.

where java >nul 2>nul
if errorlevel 1 echo WARNING: Java was not found in PATH.

where npm >nul 2>nul
if errorlevel 1 echo WARNING: npm was not found in PATH.

if "%DB_PASSWORD%"=="" echo NOTICE: DB_PASSWORD is not set. The backend may fail if MySQL requires a password.

echo.
echo [2/4] Starting Python FastAPI service...
start "Python FastAPI Engine (Port 8000)" /D "%~dp0python-service" cmd /k "call run.bat"
timeout /t 3 /nobreak >nul

echo [3/4] Starting Spring Boot backend...
start "Spring Boot Backend (Port 8080)" /D "%~dp0backend" cmd /k "call run.bat"
timeout /t 5 /nobreak >nul

echo [4/4] Starting React frontend...
start "React Vite Frontend (Port 5173)" /D "%~dp0frontend" cmd /k "call run.bat"
timeout /t 5 /nobreak >nul

echo.
echo Startup commands have been launched.
echo Check each service window for errors before opening the website.
echo Frontend: http://localhost:5173
echo Python API docs: http://localhost:8000/docs
echo.
start "" "http://localhost:5173"

pause
endlocal