@echo off
title VibeCheck Server
color 0A

echo.
echo  ============================================
echo   Shield  VibeCheck Server
echo  ============================================
echo.
echo  Server is running at http://localhost:8000
echo  Keep this window open while using VibeCheck.
echo  Press CTRL+C to stop.
echo.

cd backend
call venv\Scripts\activate
uvicorn main:app