@echo off
REM Abre backend e frontend em duas janelas
start "Semeando - Backend" cmd /k "cd backend && mvn spring-boot:run"
start "Semeando - Frontend" cmd /k "cd frontend && (if not exist node_modules npm install) && npm run dev"
echo Aguarde ~30s e acesse http://localhost:5173
