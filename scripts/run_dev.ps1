Write-Host "Starting VisionGuard AI Development Environment..." -ForegroundColor Cyan

# Start Backend
Start-Process -FilePath ".venv\Scripts\uvicorn.exe" -ArgumentList "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload" -WorkingDirectory "backend"
Write-Host "FastAPI Backend started on http://127.0.0.1:8000" -ForegroundColor Green

# Start Frontend
Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory "frontend"
Write-Host "Vite Frontend started on http://localhost:3000" -ForegroundColor Green

Write-Host "VisionGuard AI services started in separate process windows." -ForegroundColor Yellow
