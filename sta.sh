#!/bin/bash

# 1. Önce varsa eski çalışan süreçleri temizleyelim (Port çakışmasını önler)
echo "🧹 Eski süreçler temizleniyor..."
fuser -k 8000/tcp 2>/dev/null
pkill -f "node" 2>/dev/null

echo "🚀 Backend başlatılıyor..."
cd /home/emre/Booking-project/rooms || exit
php artisan serve --port=8000 &
BACKEND_PID=$!

# Backend'in ayağa kalkması için 2 saniye bekle
sleep 2

echo "🎨 Frontend başlatılıyor..."
cd /home/emre/Booking-project/frontend || exit
# NOT: Buradaki 'dev' kısmını package.json'daki script adınla değiştir (dev, start vb.)
npm run dev & 
FRONTEND_PID=$!

echo ""
echo "✅ Backend: http://localhost:8000"
echo "✅ Frontend: http://localhost:5173"
echo ""
echo "Durdurmak için Ctrl+C"

# Ctrl+C ile ikisini de durdur
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
