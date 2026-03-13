#!/bin/bash
CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${CYAN}🔍 MEVCUT DURUM (Git Status):${NC}"
git status -s

echo -e "\n${CYAN}📦 DEĞİŞİKLİKLER EKLENİYOR...${NC}"
git add .

echo -e "\n${CYAN}📋 PUSH EDİLECEK DOSYALAR:${NC}"
git diff --cached --name-only

MSG=${1:-"fix: auto-commit updates and API synchronizations"}
echo -e "\n${CYAN}📝 COMMIT ATILIYOR:${NC} $MSG"
git commit -m "$MSG"

echo -e "\n${CYAN}📤 PUSH YAPILIYOR (origin main)...${NC}"
git push -u origin main

echo -e "\n${GREEN}✅ İŞLEM TAMAMLANDI!${NC}"
