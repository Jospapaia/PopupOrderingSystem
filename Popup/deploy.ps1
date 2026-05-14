$SERVER = "root@178.105.141.67"
$APP_DIR = "/app/Popup"

Write-Host "-> Deploying to $SERVER..."

ssh $SERVER "cd $APP_DIR && git pull && docker compose up -d --build backend && echo 'Done'"

Write-Host "-> Verifying health..."
Start-Sleep -Seconds 3

$response = curl.exe -s https://api.yossiscookies.store/health
if ($response -match "ok") {
    Write-Host "OK Backend healthy"
} else {
    Write-Host "FAIL Health check failed: $response"
}
