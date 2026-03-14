@echo off
title VibeCheck — Remove Auto-startup
color 0C

echo Removing VibeCheck from Windows startup...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "VibeCheck" /f >nul 2>&1
echo  ✓ Done. VibeCheck will no longer start automatically.
echo.
pause