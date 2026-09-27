@echo off
title QueueCare AI - Backend (FastAPI + SQLite)
cd /d "%~dp0backend"
echo Starting QueueCare AI FastAPI Backend on http://127.0.0.1:8000 ...
python run.py
pause
