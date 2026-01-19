#!/bin/bash
# ============================================
# VREM - Run Database Migrations
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  VREM Database Migrations${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable not set${NC}"
    echo ""
    echo "Set it with:"
    echo "  export DATABASE_URL='postgresql://user:password@host:5432/vrem'"
    echo ""
    exit 1
fi

cd "$(dirname "$0")/../apps/backend"

echo -e "${YELLOW}Step 1: Generating Prisma client...${NC}"
npx prisma generate

echo -e "${YELLOW}Step 2: Running migrations...${NC}"
npx prisma migrate deploy

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Migrations Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Show migration status
echo -e "${YELLOW}Migration status:${NC}"
npx prisma migrate status
