#!/bin/bash
# ============================================
# VREM - Environment Variables Checker
# Validates all required env vars are set
# ============================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  VREM Environment Variables Check"
echo "========================================"
echo ""

MISSING=0

check_var() {
    local var_name=$1
    local required=$2
    local value="${!var_name}"

    if [ -z "$value" ]; then
        if [ "$required" = "required" ]; then
            echo -e "${RED}✗ $var_name${NC} (required - NOT SET)"
            MISSING=$((MISSING + 1))
        else
            echo -e "${YELLOW}○ $var_name${NC} (optional - not set)"
        fi
    else
        # Mask sensitive values
        if [[ "$var_name" == *"SECRET"* ]] || [[ "$var_name" == *"KEY"* ]] || [[ "$var_name" == *"PASSWORD"* ]] || [[ "$var_name" == *"TOKEN"* ]]; then
            echo -e "${GREEN}✓ $var_name${NC} = ****${value: -4}"
        else
            echo -e "${GREEN}✓ $var_name${NC} = $value"
        fi
    fi
}

echo "=== Backend Environment ==="
echo ""
check_var "DATABASE_URL" "required"
check_var "JWT_SECRET" "required"
check_var "PORT" "optional"
echo ""

echo "=== Authentication (Clerk) ==="
echo ""
check_var "CLERK_SECRET_KEY" "required"
echo ""

echo "=== Payments (Stripe) ==="
echo ""
check_var "STRIPE_SECRET_KEY" "required"
check_var "STRIPE_WEBHOOK_SECRET" "required"
echo ""

echo "=== Email (Resend) ==="
echo ""
check_var "RESEND_API_KEY" "required"
check_var "EMAIL_FROM" "required"
echo ""

echo "=== Storage (Supabase/Uploadcare) ==="
echo ""
check_var "SUPABASE_URL" "optional"
check_var "SUPABASE_SERVICE_ROLE_KEY" "optional"
check_var "UPLOADCARE_CDN_BASE" "optional"
echo ""

echo "=== Calendar (Nylas) ==="
echo ""
check_var "NYLAS_CLIENT_ID" "optional"
check_var "NYLAS_API_KEY" "optional"
check_var "NYLAS_API_URI" "optional"
echo ""

echo "=== URLs ==="
echo ""
check_var "FRONTEND_URL" "required"
check_var "API_URL" "required"
echo ""

echo "========================================"

if [ $MISSING -gt 0 ]; then
    echo -e "${RED}Missing $MISSING required variable(s)${NC}"
    echo ""
    echo "Set missing variables in your .env file or environment"
    exit 1
else
    echo -e "${GREEN}All required variables are set!${NC}"
    exit 0
fi
