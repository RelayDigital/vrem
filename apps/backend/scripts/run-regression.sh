#!/bin/bash
#
# Regression Test CI Harness
#
# This script:
# 1. Sets up the test database
# 2. Runs Prisma migrations
# 3. Starts the backend server
# 4. Runs the regression test suite
# 5. Cleans up
#
# Usage:
#   ./scripts/run-regression.sh
#
# Environment variables:
#   DATABASE_URL       - Database connection string (required)
#   JWT_SECRET         - JWT secret for auth (default: test-secret)
#   PORT               - Server port (default: 3001)
#   SKIP_MIGRATE       - Skip migrations if set to "true"
#   USE_JEST           - Use Jest runner instead of standalone (default: false)
#
# Exit codes:
#   0 - All tests passed
#   1 - Tests failed or setup error
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PORT="${PORT:-3001}"
JWT_SECRET="${JWT_SECRET:-test-regression-secret-key-12345}"
BASE_URL="http://localhost:${PORT}"

# Server PID file
PID_FILE="/tmp/regression-server-$$.pid"

echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}  Regression Test CI Harness${NC}"
echo -e "${CYAN}======================================${NC}"

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}Cleaning up...${NC}"

  if [ -f "$PID_FILE" ]; then
    SERVER_PID=$(cat "$PID_FILE")
    if kill -0 "$SERVER_PID" 2>/dev/null; then
      echo "Stopping server (PID: $SERVER_PID)..."
      kill "$SERVER_PID" 2>/dev/null || true
      sleep 2
      # Force kill if still running
      kill -9 "$SERVER_PID" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi

  echo "Cleanup complete."
}

# Set trap for cleanup on exit
trap cleanup EXIT INT TERM

# Change to backend directory
cd "$BACKEND_DIR"

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo -e "${YELLOW}Warning: DATABASE_URL not set. Using default test database.${NC}"
  export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vrem_test?schema=public"
fi

# Export environment variables
export JWT_SECRET
export PORT
export NODE_ENV=test

echo -e "\n${CYAN}Configuration:${NC}"
echo "  Backend dir: $BACKEND_DIR"
echo "  Port: $PORT"
echo "  Base URL: $BASE_URL"
echo "  Database: ${DATABASE_URL%%@*}@***"

# Step 1: Install dependencies (if needed)
if [ ! -d "node_modules" ]; then
  echo -e "\n${CYAN}Installing dependencies...${NC}"
  npm install
fi

# Step 2: Run Prisma migrations
if [ "$SKIP_MIGRATE" != "true" ]; then
  echo -e "\n${CYAN}Running Prisma migrations...${NC}"
  npx prisma migrate deploy 2>&1 || {
    echo -e "${YELLOW}Migration deploy failed, trying reset for test DB...${NC}"
    npx prisma migrate reset --force 2>&1 || {
      echo -e "${RED}Migration failed. Check DATABASE_URL.${NC}"
      exit 1
    }
  }

  echo -e "\n${CYAN}Generating Prisma client...${NC}"
  npx prisma generate
else
  echo -e "\n${YELLOW}Skipping migrations (SKIP_MIGRATE=true)${NC}"
fi

# Step 3: Build the backend
echo -e "\n${CYAN}Building backend...${NC}"
npm run build 2>&1 || {
  echo -e "${RED}Build failed${NC}"
  exit 1
}

# Step 4: Start the server
echo -e "\n${CYAN}Starting backend server on port ${PORT}...${NC}"

# Start server in background
node dist/main.js &
SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"

echo "Server starting (PID: $SERVER_PID)..."

# Wait for server to be ready
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}Server is ready!${NC}"
    break
  fi

  # Check if server process is still running
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${RED}Server process died unexpectedly${NC}"
    exit 1
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Waiting for server... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo -e "${RED}Server failed to start within timeout${NC}"
  exit 1
fi

# Step 5: Run regression tests
echo -e "\n${CYAN}Running regression tests...${NC}"
echo "======================================"

TEST_EXIT_CODE=0

if [ "$USE_JEST" = "true" ]; then
  # Run Jest-based tests
  npm run test:regression || TEST_EXIT_CODE=$?
else
  # Run standalone runner
  npx ts-node -r tsconfig-paths/register test/regression/regression-runner.ts "$BASE_URL" || TEST_EXIT_CODE=$?
fi

echo "======================================"

# Report result
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "\n${GREEN}======================================${NC}"
  echo -e "${GREEN}  REGRESSION TESTS PASSED${NC}"
  echo -e "${GREEN}======================================${NC}"
else
  echo -e "\n${RED}======================================${NC}"
  echo -e "${RED}  REGRESSION TESTS FAILED${NC}"
  echo -e "${RED}======================================${NC}"
fi

exit $TEST_EXIT_CODE
