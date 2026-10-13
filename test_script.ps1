node dist/main.js &
Start-Sleep -Seconds 3

Write-Host "=== 1. Start Ticket ===="
Invoke-RestMethod -Method Post -Body '{"serviceId":"6dda8911-2a6e-4f1e-aee5-84d10a29f5c5-cukur-kilat"}' -ContentType "application/json" -Uri "http://localhost:4000/api/tickets/6789dfb3-5c87-4a9a-a400-1bab1a2b1a46/start"

Write-Host "`n=== 2. Complete Ticket ===="
Invoke-RestMethod -Method Post -Body '{"serviceId":"6dda8911-2a6e-4f1e-aee5-84d10a29f5c5-cukur-kilat"}' -ContentType "application/json" -Uri "http://localhost:4000/api/tickets/6789dfb3-5c87-4a9a-a400-1bab1a2b1a46/complete"

Write-Host "`n=== 3. Check Display ===="
Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/stores/antri-lokal-demo/queue/display?serviceId=6dda8911-2a6e-4f1e-aee5-84d10a29f5c5-cukur-kilat"