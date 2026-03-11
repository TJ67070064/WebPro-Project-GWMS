@echo off
echo Starting GWMS System...
echo Checking Node.js version:
node -v

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

echo Opening browser...
start "" "http://localhost:3000"

echo Running server...
node index.js

pause