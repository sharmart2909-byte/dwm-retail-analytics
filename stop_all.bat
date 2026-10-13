@echo off
title Online Retail DWM System - Stopper
echo =======================================================================
echo Online Retail Customer Segmentation and Product Recommendation System
echo Stopping all running project services (Ports: 8000, 8080, 5173)...
echo =======================================================================
echo.

echo [1/3] Stopping Python FastAPI Engine (Port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo Terminating PID %%a...
    taskkill /F /PID %%a >nul 2>nul
)

echo [2/3] Stopping Spring Boot Backend (Port 8080)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (
    echo Terminating PID %%a...
    taskkill /F /PID %%a >nul 2>nul
)

echo [3/3] Stopping React Vite Frontend (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo Terminating PID %%a...
    taskkill /F /PID %%a >nul 2>nul
)

echo.
echo =======================================================================
echo All services stopped successfully.
echo =======================================================================
pause
