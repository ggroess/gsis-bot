@echo off
echo Starting GSIS Bot on http://localhost:8080
echo Press Ctrl+C to stop.
echo.
start http://localhost:8080
python -m http.server 8080 --directory dist
