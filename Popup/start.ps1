# Popup - start backend (Docker) + frontend (Vite dev server)
# Backend:  http://localhost:8002
# Frontend: http://localhost:5173
# Admin:    http://localhost:5173/admin

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "Starting backend (Docker Compose)..."
docker compose -f "$root\docker-compose.yml" up -d --build

Write-Host "Waiting for backend to be healthy..."
$attempts = 0
do {
    Start-Sleep -Seconds 2
    $attempts++
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8002/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        $ok = $r.StatusCode -eq 200
    } catch {
        $ok = $false
    }
} while (-not $ok -and $attempts -lt 20)

if (-not $ok) {
    Write-Error "Backend did not become healthy after $($attempts * 2)s. Check: docker compose logs backend"
    exit 1
}
Write-Host "Backend ready at http://localhost:8002"

Write-Host "Starting frontend..."
Set-Location "$root\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host ""
Write-Host "App running:"
Write-Host "  Customer: http://localhost:5173"
Write-Host "  Admin:    http://localhost:5173/admin"
Write-Host "  API:      http://localhost:8002"
