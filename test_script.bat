@echo off
cd apps/api
node dist/main.js > ..\..\server.log 2>&1 &
timeout /t 5 >nul
echo Server starting...

echo.
echo === 1. Start Ticket ===%
curl -X POST "http://localhost:4000/api/tickets/6789dfb3-5c87-4a9a-a400-1bab1a2b1a46/start" -H "Content-Type: application/json" -d "{\"serviceId\":\"6dda8911-2a6e-4f1e-aee5-84d10a29f5c5-cukur-kilat\"}"

echo.
echo === 2. Complete Ticket ===%
curl -X POST "http://localhost:4000/api/tickets/6789dfb3-5c87-4a9a-a400-1bab1a2b1a46/complete" -H "Content-Type: application/json" -d "{\"serviceId\":\"6dda8911-2a6e-4f1e-aee5-84d10a29f5c5-cukur-kilat\"}"

echo.
echo === 3. Check Display ===%
curl -X GET "http://localhost:4000/api/stores/antri-lokal-demo/queue/display?serviceId=6dda8911-2a6e-4f1e-aee5-84d10a29f5c5-cukur-kilat"