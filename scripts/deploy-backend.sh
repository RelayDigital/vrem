#!/bin/bash
# ============================================
# VREM Backend - Deploy to AWS ECS
# ============================================

set -e

# Configuration (update these)
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-YOUR_ACCOUNT_ID}"
ECR_REPO="vrem-backend"
ECS_CLUSTER="vrem-production"
ECS_SERVICE="vrem-backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  VREM Backend Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI not installed${NC}"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker not installed${NC}"
    exit 1
fi

# Check Docker daemon
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker daemon not running${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Logging into ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

echo -e "${YELLOW}Step 2: Building Docker image...${NC}"
cd "$(dirname "$0")/../apps/backend"
docker build -t $ECR_REPO:latest .

echo -e "${YELLOW}Step 3: Tagging image...${NC}"
docker tag $ECR_REPO:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest

# Also tag with git commit hash for versioning
GIT_HASH=$(git rev-parse --short HEAD)
docker tag $ECR_REPO:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$GIT_HASH

echo -e "${YELLOW}Step 4: Pushing to ECR...${NC}"
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$GIT_HASH

echo -e "${YELLOW}Step 5: Updating ECS service...${NC}"
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $ECS_SERVICE \
    --force-new-deployment \
    --region $AWS_REGION

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment initiated!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Image: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$GIT_HASH"
echo ""
echo "Monitor deployment:"
echo "  aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_REGION"
echo ""
