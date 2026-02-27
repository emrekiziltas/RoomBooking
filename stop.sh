#!/bin/bash

echo "🛑 InI Booking süreçleri durduruluyor..."

# 1. Port 8000'deki PHP (Artisan) sürecini durdur
echo "🔌 Backend (Port 8000) kapatılıyor..."
fuser -k 8000/tcp 2>/dev/null

# 2. Port 5173'teki Vite (Frontend) sürecini durdur
echo "🔌 Frontend (Port 5173) kapatılıyor..."
fuser -k 5173/tcp 2>/dev/null

# 3. Kalan Node süreçlerini temizle (Opsiyonel ama garanti)
# pkill -f "node"

echo "✨ Her şey tertemiz kapatıldı."
