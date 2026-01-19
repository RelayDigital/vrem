#!/bin/bash
# ============================================
# VREM - AWS Infrastructure Setup
# Run once to create initial AWS resources
# ============================================

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="vrem"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  VREM AWS Infrastructure Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI not installed${NC}"
    echo "Install: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "AWS Account: ${GREEN}$AWS_ACCOUNT_ID${NC}"
echo -e "Region: ${GREEN}$AWS_REGION${NC}"
echo ""

# ============================================
# 1. Create ECR Repository
# ============================================
echo -e "${YELLOW}Creating ECR repository...${NC}"
aws ecr create-repository \
    --repository-name ${PROJECT_NAME}-backend \
    --region $AWS_REGION \
    --image-scanning-configuration scanOnPush=true \
    2>/dev/null || echo "Repository already exists"

# ============================================
# 2. Create ECS Cluster
# ============================================
echo -e "${YELLOW}Creating ECS cluster...${NC}"
aws ecs create-cluster \
    --cluster-name ${PROJECT_NAME}-production \
    --capacity-providers FARGATE FARGATE_SPOT \
    --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
    --region $AWS_REGION \
    2>/dev/null || echo "Cluster already exists"

# ============================================
# 3. Create CloudWatch Log Group
# ============================================
echo -e "${YELLOW}Creating CloudWatch log group...${NC}"
aws logs create-log-group \
    --log-group-name /ecs/${PROJECT_NAME}-backend \
    --region $AWS_REGION \
    2>/dev/null || echo "Log group already exists"

# ============================================
# 4. Create Secrets (placeholders)
# ============================================
echo -e "${YELLOW}Creating secrets placeholders...${NC}"

create_secret() {
    aws secretsmanager create-secret \
        --name "$1" \
        --secret-string "$2" \
        --region $AWS_REGION \
        2>/dev/null || echo "Secret $1 already exists"
}

create_secret "${PROJECT_NAME}/database-url" "postgresql://user:password@host:5432/vrem"
create_secret "${PROJECT_NAME}/clerk-secret" "sk_live_REPLACE_ME"
create_secret "${PROJECT_NAME}/stripe-secret" "sk_live_REPLACE_ME"
create_secret "${PROJECT_NAME}/stripe-webhook-secret" "whsec_REPLACE_ME"
create_secret "${PROJECT_NAME}/resend-api-key" "re_REPLACE_ME"
create_secret "${PROJECT_NAME}/jwt-secret" "REPLACE_WITH_RANDOM_STRING"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update secrets in AWS Secrets Manager with real values"
echo "2. Create RDS Aurora PostgreSQL database"
echo "3. Create VPC, subnets, and security groups (or use default)"
echo "4. Create Application Load Balancer"
echo "5. Register ECS task definition"
echo "6. Create ECS service"
echo ""
echo "See DEPLOYMENT.md for detailed instructions."
echo ""
