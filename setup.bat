@echo off
title VibeCheck Setup
color 0A

echo.
echo  ============================================
echo   🛡️  VibeCheck — Sentiment Shield Setup
echo  ============================================
echo.

:: ─── Check Python ─────────────────────────────────────────────────────────
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ❌ Python not found.
    echo  Please install Python 3.10+ from https://python.org
    echo  Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)
echo  ✓ Python found.

:: ─── Create Virtual Environment ───────────────────────────────────────────
echo.
echo [2/5] Setting up Python virtual environment...
cd backend
if exist venv (
    echo  ✓ Virtual environment already exists, skipping.
) else (
    python -m venv venv
    if errorlevel 1 (
        echo  ❌ Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo  ✓ Virtual environment created.
)

:: ─── Install Dependencies ─────────────────────────────────────────────────
echo.
echo [3/5] Installing Python dependencies...
echo  This may take a few minutes on first run.
echo.
call venv\Scripts\activate
pip install fastapi uvicorn transformers torch --quiet
if errorlevel 1 (
    echo  ❌ Failed to install dependencies.
    pause
    exit /b 1
)
echo  ✓ Dependencies installed.

:: ─── Download Model ───────────────────────────────────────────────────────
echo.
echo [4/5] Downloading NLP model (first time only, ~330MB)...
echo  Please wait, this may take a few minutes depending on your connection.
echo.
python -c "from transformers import pipeline; print('Downloading...'); pipeline(task='text-classification', model='SamLowe/roberta-base-go_emotions', top_k=1); print('Done')"
if errorlevel 1 (
    echo  ❌ Failed to download model. Check your internet connection.
    pause
    exit /b 1
)
echo  ✓ Model downloaded and cached.

:: ─── Create Start Script ──────────────────────────────────────────────────
echo.
echo [5/5] Creating start script...
cd ..
echo @echo off > start.bat
echo title VibeCheck Server >> start.bat
echo color 0A >> start.bat
echo echo. >> start.bat
echo echo  ============================================ >> start.bat
echo echo   🛡️  VibeCheck Server >> start.bat
echo echo  ============================================ >> start.bat
echo echo. >> start.bat
echo echo  Server is running at http://localhost:8000 >> start.bat
echo echo  Keep this window open while using VibeCheck. >> start.bat
echo echo  Press CTRL+C to stop. >> start.bat
echo echo. >> start.bat
echo cd backend >> start.bat
echo call venv\Scripts\activate >> start.bat
echo uvicorn main:app >> start.bat
echo  ✓ Start script created.

:: ─── Done ─────────────────────────────────────────────────────────────────
echo.
echo  ============================================
echo   ✅ Setup Complete!
echo  ============================================
echo.
echo  Next steps:
echo.
echo  1. Run start.bat to start the VibeCheck server
echo  2. Open Chrome and go to chrome://extensions
echo  3. Enable Developer Mode (top right toggle)
echo  4. Click "Load unpacked"
echo  5. Select the "extension\dist" folder
echo  6. The VibeCheck icon will appear in your toolbar
echo.
echo  ⚠️  Always run start.bat before using the extension.
echo.
pause