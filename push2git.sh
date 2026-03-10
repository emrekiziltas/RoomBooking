#!/bin/bash

# Renkler (Terminalde havalı görünmesi için)
CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m' # Renk Yok

echo -e "${CYA}🔍 MEVCUT DURUM (Git Status):${NC}"
git status -s

echo -e "\n${CYAN}📦 DEĞİŞİKLİKLER EKLENİYOR...${NC}"
git add .

# Eğer scripti çalıştırırken mesaj yazmazsan varsayılan mesajı kullanır
MSG=${1:-"fix: auto-commit updates and API synchronizations"}

echo -e "${CYAN}📝 COMMIT ATILIYOR:${NC} $MSG"
git commit -m "$MSG"

echo -e "${CYAN}📤 PUSH YAPILIYOR (origin main)...${NC}"
git push -u origin main

echo -e "${GREEN}✅ İŞLEM TAMAMLANDI!${NC}"
