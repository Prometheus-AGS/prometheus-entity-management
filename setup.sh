#!/usr/bin/env bash
# setup.sh — bootstrap the full monorepo
set -e

BOLD="\033[1m"
DIM="\033[2m"
EMBER="\033[38;5;208m"
GREEN="\033[32m"
RESET="\033[0m"

echo ""
echo -e "${EMBER}${BOLD}  ⬡  prometheus-entity-management${RESET}"
echo -e "${DIM}  Normalized entity graph store for React${RESET}"
echo ""

echo -e "→ Installing workspace dependencies..."
npm install

echo ""
echo -e "${GREEN}${BOLD}  ✓ Setup complete${RESET}"
echo ""
echo -e "  ${BOLD}Vite example app${RESET} (React 19, Projects/Tasks/Team CRUD)"
echo -e "  ${DIM}cd examples/vite-app && npm run dev${RESET}"
echo -e "  ${EMBER}→ http://localhost:5173${RESET}"
echo ""
echo -e "  ${BOLD}Next.js example app${RESET} (SSR hydration, product catalog)"
echo -e "  ${DIM}cd examples/nextjs-app && npm run dev${RESET}"
echo -e "  ${EMBER}→ http://localhost:3000${RESET}"
echo ""
echo -e "  ${BOLD}Both at once${RESET} (from project root):"
echo -e "  ${DIM}npm run dev:vite  &  npm run dev:next${RESET}"
echo ""
