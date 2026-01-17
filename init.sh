#!/bin/bash

# VREM Development Environment Setup Script
# Run this at the start of each development session

set -e  # Exit on error

echo "========================================"
echo "  VREM Development Environment"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

echo "Checking prerequisites..."
echo ""

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node -v)
    print_status 0 "Node.js installed: $NODE_VERSION"
else
    print_status 1 "Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    print_status 0 "npm installed: $NPM_VERSION"
else
    print_status 1 "npm not found"
    exit 1
fi

# Check if PostgreSQL is available
if command_exists psql; then
    print_status 0 "PostgreSQL client available"
else
    echo -e "${YELLOW}!${NC} PostgreSQL client not found (optional for local dev)"
fi

# Check if git is available
if command_exists git; then
    print_status 0 "Git installed"
else
    print_status 1 "Git not found"
    exit 1
fi

echo ""
echo "Checking project structure..."
echo ""

# Check if project directories exist
if [ -d "apps/frontend" ]; then
    print_status 0 "Frontend directory exists"

    # Check if dependencies are installed
    if [ -d "apps/frontend/node_modules" ]; then
        print_status 0 "Frontend dependencies installed"
    else
        echo -e "${YELLOW}!${NC} Installing frontend dependencies..."
        cd apps/frontend && npm install && cd ../..
    fi
else
    echo -e "${YELLOW}!${NC} Frontend directory not found - needs setup"
fi

if [ -d "apps/backend" ]; then
    print_status 0 "Backend directory exists"

    # Check if dependencies are installed
    if [ -d "apps/backend/node_modules" ]; then
        print_status 0 "Backend dependencies installed"
    else
        echo -e "${YELLOW}!${NC} Installing backend dependencies..."
        cd apps/backend && npm install && cd ../..
    fi
else
    echo -e "${YELLOW}!${NC} Backend directory not found - needs setup"
fi

echo ""
echo "Checking environment files..."
echo ""

# Check for environment files
if [ -f "apps/frontend/.env.local" ]; then
    print_status 0 "Frontend .env.local exists"
else
    echo -e "${YELLOW}!${NC} Frontend .env.local not found"
    if [ -f "apps/frontend/.env.example" ]; then
        echo "   Copying from .env.example..."
        cp apps/frontend/.env.example apps/frontend/.env.local
    fi
fi

if [ -f "apps/backend/.env" ]; then
    print_status 0 "Backend .env exists"
else
    echo -e "${YELLOW}!${NC} Backend .env not found"
    if [ -f "apps/backend/.env.example" ]; then
        echo "   Copying from .env.example..."
        cp apps/backend/.env.example apps/backend/.env
    fi
fi

echo ""
echo "Checking database..."
echo ""

# Run Prisma migrations if backend exists
if [ -d "apps/backend" ] && [ -f "apps/backend/prisma/schema.prisma" ]; then
    echo "Running Prisma generate..."
    cd apps/backend
    npx prisma generate 2>/dev/null || echo -e "${YELLOW}!${NC} Prisma generate failed - database may not be configured"
    cd ../..
    print_status 0 "Prisma client generated"
fi

echo ""
echo "========================================"
echo "  Environment Check Complete"
echo "========================================"
echo ""

# Show git status
echo "Recent git commits:"
git log --oneline -5 2>/dev/null || echo "No git history yet"
echo ""

# Show current feature status
if [ -f "feature_list.json" ]; then
    TOTAL=$(grep -c '"passes"' feature_list.json 2>/dev/null || echo "0")
    PASSED=$(grep -c '"passes": true' feature_list.json 2>/dev/null || echo "0")
    echo "Feature Progress: $PASSED / $TOTAL completed"
fi

echo ""
echo "To start development servers:"
echo "  Frontend: cd apps/frontend && npm run dev"
echo "  Backend:  cd apps/backend && npm run start:dev"
echo ""
echo "Next: Read activity.md and feature_list.json to find your next task"
echo ""
