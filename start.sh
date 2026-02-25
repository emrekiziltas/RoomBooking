#!/bin/bash

echo "🚀 Backend başlatılıyor..."
cd /home/emre/booking-project/rooms
php artisan serve &
BACKEND_PID=$!

echo "🎨 Frontend başlatılıyor..."
cd /home/emre/booking-project/frontend
npm run &
FRONTEND_PID=$!

echo "✅ Backend: http://localhost:8000"
echo "✅ Frontend: http://localhost:5173"
echo ""
echo "Durdurmak için Ctrl+C"

# Ctrl+C ile ikisini de durdur
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
