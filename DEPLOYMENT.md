# VREM - Complete Manual Deployment Guide

This guide provides step-by-step instructions for manually deploying the VREM application using Vercel (frontend) and AWS (backend).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Part 1: AWS Account Setup](#part-1-aws-account-setup)
4. [Part 2: Backend Deployment (ECS Fargate)](#part-2-backend-deployment-ecs-fargate)
5. [Part 3: Database Setup (RDS PostgreSQL)](#part-3-database-setup-rds-postgresql)
6. [Part 4: Frontend Deployment (Vercel)](#part-4-frontend-deployment-vercel)
7. [Part 5: Domain & SSL Configuration](#part-5-domain--ssl-configuration)
8. [Part 6: Third-Party Services Configuration](#part-6-third-party-services-configuration)
9. [Ongoing Operations](#ongoing-operations)
10. [Troubleshooting](#troubleshooting)
11. [Cost Estimates](#cost-estimates)

---

## Prerequisites

### Required Tools

Install these tools on your local machine before starting:

```bash
# 1. AWS CLI v2
# macOS
brew install awscli

# Verify installation
aws --version
# Should show: aws-cli/2.x.x

# 2. Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop/
# Verify Docker is running
docker info

# 3. Node.js 20+ and npm
# macOS
brew install node@20

# Verify
node --version  # Should be v20.x.x
npm --version

# 4. Git
git --version

# 5. Vercel CLI (optional, for CLI deployments)
npm install -g vercel
```

### Required Accounts

You'll need accounts with these services:

| Service | Purpose | Sign Up URL |
|---------|---------|-------------|
| **AWS** | Backend hosting, database | https://aws.amazon.com/ |
| **Vercel** | Frontend hosting | https://vercel.com/ |
| **Clerk** | Authentication | https://dashboard.clerk.com/ |
| **Stripe** | Payments | https://dashboard.stripe.com/ |
| **Resend** | Email delivery | https://resend.com/ |
| **Mapbox** | Maps | https://account.mapbox.com/ |
| **Uploadcare** | File uploads | https://uploadcare.com/ |

### Gather API Keys

Before deployment, collect these values from each service:

```
# From Clerk Dashboard
CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx

# From Stripe Dashboard → Developers → API Keys
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx (created later)

# From Resend Dashboard
RESEND_API_KEY=re_xxxxx

# From Mapbox Account → Access Tokens
MAPBOX_TOKEN=pk.xxxxx

# From Uploadcare Dashboard → API Keys
UPLOADCARE_PUBLIC_KEY=xxxxx
UPLOADCARE_PRIVATE_KEY=xxxxx
```

---

## Architecture Overview

```
                                Internet
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
         ┌──────────────────┐         ┌──────────────────────────┐
         │     Vercel       │         │  Application Load        │
         │   (Frontend)     │         │  Balancer (ALB)          │
         │   Next.js SSR    │         │  Port 80 → 443           │
         └──────────────────┘         └──────────────────────────┘
                    │                             │
                    │                             ▼
                    │              ┌──────────────────────────────┐
                    │              │      ECS Fargate             │
                    │              │      (Backend API)           │
                    │              │      NestJS on Port 3001     │
                    │              └──────────────────────────────┘
                    │                             │
                    │              ┌──────────────┼──────────────┐
                    │              ▼              ▼              ▼
                    │     ┌──────────────┐ ┌──────────────┐ ┌──────────┐
                    └────▶│    RDS       │ │   Secrets    │ │CloudWatch│
                          │  PostgreSQL  │ │   Manager    │ │   Logs   │
                          └──────────────┘ └──────────────┘ └──────────┘
```

**Why This Architecture?**
- **Vercel**: Native Next.js platform with zero-config SSR, edge functions, and excellent Clerk integration
- **AWS ECS Fargate**: Serverless containers for the NestJS backend - no server management
- **AWS RDS**: Managed PostgreSQL with automated backups and scaling

---

## Part 1: AWS Account Setup

### Step 1.1: Configure AWS CLI

```bash
# Configure AWS credentials
aws configure

# Enter when prompted:
# AWS Access Key ID: [Your access key]
# AWS Secret Access Key: [Your secret key]
# Default region name: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity

# Should output something like:
# {
#     "UserId": "AIDAXXXXXXXXXXXXXXXXX",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/your-username"
# }
```

**Note your Account ID** - you'll need it throughout this guide. In this example: `123456789012`

### Step 1.2: Create IAM User (If Not Using Root)

```bash
# Create deployment user
aws iam create-user --user-name vrem-deployer

# Attach necessary policies
aws iam attach-user-policy --user-name vrem-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

aws iam attach-user-policy --user-name vrem-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess

aws iam attach-user-policy --user-name vrem-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess

aws iam attach-user-policy --user-name vrem-deployer \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

aws iam attach-user-policy --user-name vrem-deployer \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess

aws iam attach-user-policy --user-name vrem-deployer \
  --policy-arn arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess

# Create access key for CLI use
aws iam create-access-key --user-name vrem-deployer
```

---

## Part 2: Backend Deployment (ECS Fargate)

### Step 2.1: Create ECR Repository

ECR (Elastic Container Registry) stores your Docker images.

```bash
# Set your AWS account ID as variable
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1

# Create repository
aws ecr create-repository \
  --repository-name vrem-backend \
  --region $AWS_REGION \
  --image-scanning-configuration scanOnPush=true

# Verify creation
aws ecr describe-repositories --repository-names vrem-backend --region $AWS_REGION
```

### Step 2.2: Build and Push Docker Image

```bash
# Navigate to project root
cd /path/to/vrem

# Navigate to backend directory
cd apps/backend

# Authenticate Docker with ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build Docker image (for linux/amd64 - required for Fargate)
docker buildx build --platform linux/amd64 -t vrem-backend:latest .

# Tag image for ECR
docker tag vrem-backend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/vrem-backend:latest

# Push to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/vrem-backend:latest

# Verify push succeeded
aws ecr list-images --repository-name vrem-backend --region $AWS_REGION
```

### Step 2.3: Create Secrets in AWS Secrets Manager

Store sensitive configuration securely:

```bash
# Create each secret (replace PLACEHOLDER values with real ones later)

# Database URL (placeholder for now - update after RDS creation)
aws secretsmanager create-secret \
  --name vrem/database-url \
  --secret-string "postgresql://PLACEHOLDER" \
  --region $AWS_REGION

# JWT Secret (generate random)
aws secretsmanager create-secret \
  --name vrem/jwt-secret \
  --secret-string "$(openssl rand -base64 64)" \
  --region $AWS_REGION

# Clerk Secret Key
aws secretsmanager create-secret \
  --name vrem/clerk-secret \
  --secret-string "sk_live_YOUR_CLERK_SECRET_HERE" \
  --region $AWS_REGION

# Stripe Secret Key
aws secretsmanager create-secret \
  --name vrem/stripe-secret \
  --secret-string "sk_live_YOUR_STRIPE_SECRET_HERE" \
  --region $AWS_REGION

# Stripe Webhook Secret (placeholder - update after webhook creation)
aws secretsmanager create-secret \
  --name vrem/stripe-webhook-secret \
  --secret-string "whsec_PLACEHOLDER" \
  --region $AWS_REGION

# Resend API Key
aws secretsmanager create-secret \
  --name vrem/resend-api-key \
  --secret-string "re_YOUR_RESEND_KEY_HERE" \
  --region $AWS_REGION

# Uploadcare Keys
aws secretsmanager create-secret \
  --name vrem/uploadcare-public-key \
  --secret-string "YOUR_UPLOADCARE_PUBLIC_KEY" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name vrem/uploadcare-private-key \
  --secret-string "YOUR_UPLOADCARE_PRIVATE_KEY" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name vrem/uploadcare-cdn-base \
  --secret-string "https://ucarecdn.com" \
  --region $AWS_REGION
```

**To update a secret later:**
```bash
aws secretsmanager put-secret-value \
  --secret-id vrem/database-url \
  --secret-string "postgresql://user:password@host:5432/vrem" \
  --region $AWS_REGION
```

### Step 2.4: Create ECS Cluster

```bash
# Create cluster
aws ecs create-cluster \
  --cluster-name vrem-production \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1,base=1 \
  --region $AWS_REGION

# Verify
aws ecs describe-clusters --clusters vrem-production --region $AWS_REGION
```

### Step 2.5: Create CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/vrem-backend \
  --region $AWS_REGION

# Set retention to 30 days (optional, saves costs)
aws logs put-retention-policy \
  --log-group-name /ecs/vrem-backend \
  --retention-in-days 30 \
  --region $AWS_REGION
```

### Step 2.6: Create IAM Role for ECS Tasks

Create the task execution role that allows ECS to pull images and access secrets:

```bash
# Create trust policy file
cat > /tmp/ecs-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name vrem-ecs-task-execution-role \
  --assume-role-policy-document file:///tmp/ecs-trust-policy.json

# Attach ECS task execution policy
aws iam attach-role-policy \
  --role-name vrem-ecs-task-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Create policy for Secrets Manager access
cat > /tmp/secrets-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:vrem/*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name vrem-ecs-task-execution-role \
  --policy-name vrem-secrets-access \
  --policy-document file:///tmp/secrets-policy.json
```

### Step 2.7: Get VPC and Subnet Information

```bash
# Get default VPC ID
export VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text \
  --region $AWS_REGION)

echo "VPC ID: $VPC_ID"

# Get subnet IDs (need at least 2 for ALB)
export SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[*].SubnetId' \
  --output text \
  --region $AWS_REGION)

echo "Subnets: $SUBNET_IDS"

# Convert to array for later use
SUBNET_ARRAY=($SUBNET_IDS)
export SUBNET_1=${SUBNET_ARRAY[0]}
export SUBNET_2=${SUBNET_ARRAY[1]}

echo "Subnet 1: $SUBNET_1"
echo "Subnet 2: $SUBNET_2"
```

### Step 2.8: Create Security Groups

```bash
# Security group for ALB (allows HTTP/HTTPS from internet)
export ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name vrem-alb-sg \
  --description "Security group for VREM ALB" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text \
  --region $AWS_REGION)

echo "ALB Security Group: $ALB_SG_ID"

# Allow HTTP from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION

# Allow HTTPS from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION

# Security group for Backend (allows traffic from ALB only)
export BACKEND_SG_ID=$(aws ec2 create-security-group \
  --group-name vrem-backend-sg \
  --description "Security group for VREM Backend" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text \
  --region $AWS_REGION)

echo "Backend Security Group: $BACKEND_SG_ID"

# Allow port 3001 from ALB security group only
aws ec2 authorize-security-group-ingress \
  --group-id $BACKEND_SG_ID \
  --protocol tcp \
  --port 3001 \
  --source-group $ALB_SG_ID \
  --region $AWS_REGION
```

### Step 2.9: Create Application Load Balancer

```bash
# Create ALB
export ALB_ARN=$(aws elbv2 create-load-balancer \
  --name vrem-backend-alb \
  --subnets $SUBNET_1 $SUBNET_2 \
  --security-groups $ALB_SG_ID \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text \
  --region $AWS_REGION)

echo "ALB ARN: $ALB_ARN"

# Get ALB DNS name
export ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text \
  --region $AWS_REGION)

echo "ALB DNS: $ALB_DNS"

# Create target group
export TG_ARN=$(aws elbv2 create-target-group \
  --name vrem-backend-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-protocol HTTP \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text \
  --region $AWS_REGION)

echo "Target Group ARN: $TG_ARN"

# Create HTTP listener (port 80)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $AWS_REGION
```

### Step 2.10: Create ECS Task Definition

```bash
# Get secret ARNs
DATABASE_URL_ARN=$(aws secretsmanager describe-secret --secret-id vrem/database-url --query 'ARN' --output text --region $AWS_REGION)
JWT_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id vrem/jwt-secret --query 'ARN' --output text --region $AWS_REGION)
CLERK_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id vrem/clerk-secret --query 'ARN' --output text --region $AWS_REGION)
STRIPE_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id vrem/stripe-secret --query 'ARN' --output text --region $AWS_REGION)
STRIPE_WEBHOOK_ARN=$(aws secretsmanager describe-secret --secret-id vrem/stripe-webhook-secret --query 'ARN' --output text --region $AWS_REGION)
RESEND_API_ARN=$(aws secretsmanager describe-secret --secret-id vrem/resend-api-key --query 'ARN' --output text --region $AWS_REGION)
UPLOADCARE_PUBLIC_ARN=$(aws secretsmanager describe-secret --secret-id vrem/uploadcare-public-key --query 'ARN' --output text --region $AWS_REGION)
UPLOADCARE_PRIVATE_ARN=$(aws secretsmanager describe-secret --secret-id vrem/uploadcare-private-key --query 'ARN' --output text --region $AWS_REGION)
UPLOADCARE_CDN_ARN=$(aws secretsmanager describe-secret --secret-id vrem/uploadcare-cdn-base --query 'ARN' --output text --region $AWS_REGION)

# Create task definition file
cat > /tmp/task-definition.json << EOF
{
  "family": "vrem-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/vrem-ecs-task-execution-role",
  "containerDefinitions": [
    {
      "name": "vrem-backend",
      "image": "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/vrem-backend:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3001"},
        {"name": "FRONTEND_URL", "value": "https://your-domain.com"},
        {"name": "API_URL", "value": "http://${ALB_DNS}"},
        {"name": "USE_PRODUCTION_URLS", "value": "true"},
        {"name": "EMAIL_FROM", "value": "VREM <noreply@your-domain.com>"}
      ],
      "secrets": [
        {"name": "DATABASE_URL", "valueFrom": "${DATABASE_URL_ARN}"},
        {"name": "JWT_SECRET", "valueFrom": "${JWT_SECRET_ARN}"},
        {"name": "CLERK_SECRET_KEY", "valueFrom": "${CLERK_SECRET_ARN}"},
        {"name": "STRIPE_SECRET_KEY", "valueFrom": "${STRIPE_SECRET_ARN}"},
        {"name": "STRIPE_WEBHOOK_SECRET", "valueFrom": "${STRIPE_WEBHOOK_ARN}"},
        {"name": "RESEND_API_KEY", "valueFrom": "${RESEND_API_ARN}"},
        {"name": "UPLOADCARE_PUBLIC_KEY", "valueFrom": "${UPLOADCARE_PUBLIC_ARN}"},
        {"name": "UPLOADCARE_PRIVATE_KEY", "valueFrom": "${UPLOADCARE_PRIVATE_ARN}"},
        {"name": "UPLOADCARE_CDN_BASE", "valueFrom": "${UPLOADCARE_CDN_ARN}"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/vrem-backend",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# Register task definition
aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-definition.json \
  --region $AWS_REGION

echo "Task definition registered!"
```

### Step 2.11: Create ECS Service

```bash
# Create service
aws ecs create-service \
  --cluster vrem-production \
  --service-name vrem-backend \
  --task-definition vrem-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$BACKEND_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=vrem-backend,containerPort=3001" \
  --health-check-grace-period-seconds 120 \
  --scheduling-strategy REPLICA \
  --deployment-configuration "minimumHealthyPercent=50,maximumPercent=200" \
  --region $AWS_REGION

echo "ECS Service created!"
echo ""
echo "Backend will be available at: http://$ALB_DNS"
echo "(May take 2-3 minutes for health checks to pass)"
```

### Step 2.12: Verify Backend Deployment

```bash
# Check service status
aws ecs describe-services \
  --cluster vrem-production \
  --services vrem-backend \
  --query 'services[0].{status:status,running:runningCount,desired:desiredCount,pending:pendingCount}' \
  --region $AWS_REGION

# Check target health
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --region $AWS_REGION

# Test health endpoint (wait 2-3 minutes after creation)
curl http://$ALB_DNS/health
```

---

## Part 3: Database Setup (RDS PostgreSQL)

### Step 3.1: Create Database Security Group

```bash
# Create security group for RDS
export RDS_SG_ID=$(aws ec2 create-security-group \
  --group-name vrem-rds-sg \
  --description "Security group for VREM RDS" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text \
  --region $AWS_REGION)

echo "RDS Security Group: $RDS_SG_ID"

# Allow PostgreSQL from backend security group
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $BACKEND_SG_ID \
  --region $AWS_REGION
```

### Step 3.2: Create DB Subnet Group

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name vrem-db-subnet-group \
  --db-subnet-group-description "Subnet group for VREM database" \
  --subnet-ids $SUBNET_1 $SUBNET_2 \
  --region $AWS_REGION
```

### Step 3.3: Create RDS PostgreSQL Instance

```bash
# Generate a secure password
export DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
echo "Database Password: $DB_PASSWORD"
echo "(Save this password securely!)"

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier vrem-production \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username vrem_admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --max-allocated-storage 100 \
  --storage-type gp3 \
  --db-subnet-group-name vrem-db-subnet-group \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-name vrem \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:04:00-sun:05:00" \
  --no-publicly-accessible \
  --storage-encrypted \
  --region $AWS_REGION

echo "RDS instance creation started. This takes 5-10 minutes..."
```

### Step 3.4: Wait for RDS and Get Endpoint

```bash
# Wait for RDS to be available
aws rds wait db-instance-available \
  --db-instance-identifier vrem-production \
  --region $AWS_REGION

echo "RDS is ready!"

# Get the endpoint
export RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier vrem-production \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text \
  --region $AWS_REGION)

echo "RDS Endpoint: $RDS_ENDPOINT"

# Construct the full DATABASE_URL
export DATABASE_URL="postgresql://vrem_admin:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/vrem"
echo "DATABASE_URL: $DATABASE_URL"
```

### Step 3.5: Update Database URL Secret

```bash
aws secretsmanager put-secret-value \
  --secret-id vrem/database-url \
  --secret-string "$DATABASE_URL" \
  --region $AWS_REGION

echo "Database URL secret updated!"
```

### Step 3.6: Run Database Migrations

```bash
# Run migration as one-off ECS task
aws ecs run-task \
  --cluster vrem-production \
  --task-definition vrem-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$BACKEND_SG_ID],assignPublicIp=ENABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "vrem-backend",
      "command": ["npx", "prisma", "migrate", "deploy"]
    }]
  }' \
  --region $AWS_REGION

# Check task logs for migration output
aws logs tail /ecs/vrem-backend --follow --region $AWS_REGION
```

### Step 3.7: Force New Backend Deployment

After updating the database secret, restart the backend:

```bash
aws ecs update-service \
  --cluster vrem-production \
  --service vrem-backend \
  --force-new-deployment \
  --region $AWS_REGION
```

---

## Part 4: Frontend Deployment (Vercel)

Vercel is the native platform for Next.js and provides zero-config deployment with excellent performance.

### Step 4.1: Connect Repository to Vercel

**Via Vercel Dashboard (Recommended):**

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub/GitLab/Bitbucket account
4. Choose the `vrem` repository
5. Configure the project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `apps/frontend`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
6. Click "Deploy"

**Via Vercel CLI:**

```bash
# Login to Vercel
vercel login

# Navigate to frontend directory
cd apps/frontend

# Link to Vercel (creates new project)
vercel link

# Deploy to production
vercel --prod
```

### Step 4.2: Configure Environment Variables

In the Vercel Dashboard:

1. Go to your project → Settings → Environment Variables
2. Add the following variables for **Production** environment:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` | Your backend ALB URL |
| `NEXT_PUBLIC_USE_PRODUCTION_API` | `true` | |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_xxxxx` | From Clerk Dashboard |
| `CLERK_SECRET_KEY` | `sk_live_xxxxx` | From Clerk Dashboard |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` | |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/signup` | |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` | |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` | |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `pk.xxxxx` | From Mapbox |
| `NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY` | `xxxxx` | From Uploadcare |

3. Click "Save"

**Via Vercel CLI:**

```bash
# Add environment variables
vercel env add NEXT_PUBLIC_API_URL production
vercel env add CLERK_SECRET_KEY production
# ... repeat for each variable
```

### Step 4.3: Configure Project Settings

In Vercel Dashboard → Settings:

1. **General**:
   - Root Directory: `apps/frontend`
   - Framework Preset: Next.js

2. **Git**:
   - Production Branch: `main`
   - Automatic deployments enabled

3. **Functions** (optional):
   - Region: Choose closest to your users (e.g., `iad1` for US East)

### Step 4.4: Trigger Deployment

Deployments happen automatically on push to `main`. For manual deployment:

```bash
# Via CLI
cd apps/frontend
vercel --prod

# Or trigger from dashboard
# Go to Deployments → Create Deployment
```

### Step 4.5: Get Frontend URL

After deployment, your frontend will be available at:
- **Production**: `https://your-project.vercel.app`
- **Preview**: `https://your-project-git-branch.vercel.app`

To use a custom domain, see [Part 5: Domain Configuration](#step-54-configure-custom-domain-in-vercel).

---

## Part 5: Domain & SSL Configuration

### Step 5.1: Request SSL Certificate for Backend (ACM)

```bash
# Request certificate for API domain
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS \
  --region $AWS_REGION

# Note the certificate ARN from the output
```

### Step 5.2: Validate Certificate

1. Go to ACM Console: https://console.aws.amazon.com/acm/
2. Click on the pending certificate
3. Click "Create records in Route 53" (if using Route 53)
4. Or manually add the CNAME records to your DNS

### Step 5.3: Add HTTPS Listener to ALB

```bash
# Get certificate ARN
export CERT_ARN="arn:aws:acm:us-east-1:$AWS_ACCOUNT_ID:certificate/xxxxx"

# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $AWS_REGION

# Redirect HTTP to HTTPS
HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --query 'Listeners[?Port==`80`].ListenerArn' \
  --output text \
  --region $AWS_REGION)

aws elbv2 modify-listener \
  --listener-arn $HTTP_LISTENER_ARN \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
  --region $AWS_REGION
```

### Step 5.4: Configure Custom Domain in Vercel

1. In Vercel Dashboard, go to your project → Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com` or `app.yourdomain.com`)
4. Vercel will provide DNS records to add:
   - For apex domain: Add an `A` record pointing to Vercel's IP
   - For subdomain: Add a `CNAME` record pointing to `cname.vercel-dns.com`
5. Vercel automatically provisions SSL certificates

### Step 5.5: Update Environment Variables

After setting up domains, update:

**Backend (ECS Task Definition):**
- `FRONTEND_URL`: `https://yourdomain.com`
- `API_URL`: `https://api.yourdomain.com`

**Frontend (Vercel):**
- `NEXT_PUBLIC_API_URL`: `https://api.yourdomain.com`

---

## Part 6: Third-Party Services Configuration

### Step 6.1: Configure Clerk

1. Go to https://dashboard.clerk.com
2. Create or select your application
3. Go to Settings → Domains
4. Add your production domains:
   - Frontend: `yourdomain.com`
   - Backend: `api.yourdomain.com`
5. Copy the production keys and update:
   - Vercel environment variables
   - AWS Secrets Manager

### Step 6.2: Configure Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://api.yourdomain.com/payments/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret
6. Update AWS Secrets Manager:

```bash
aws secretsmanager put-secret-value \
  --secret-id vrem/stripe-webhook-secret \
  --secret-string "whsec_your_webhook_secret" \
  --region $AWS_REGION
```

### Step 6.3: Configure Resend Domain

1. Go to https://resend.com/domains
2. Add your domain
3. Add the required DNS records (SPF, DKIM, DMARC)
4. Verify the domain

### Step 6.4: Restart Backend After Secret Updates

```bash
aws ecs update-service \
  --cluster vrem-production \
  --service vrem-backend \
  --force-new-deployment \
  --region $AWS_REGION
```

---

## Ongoing Operations

### View Backend Logs

```bash
# Stream logs in real-time
aws logs tail /ecs/vrem-backend --follow --region $AWS_REGION

# Get recent logs
aws logs get-log-events \
  --log-group-name /ecs/vrem-backend \
  --log-stream-name "$(aws logs describe-log-streams \
    --log-group-name /ecs/vrem-backend \
    --order-by LastEventTime \
    --descending \
    --limit 1 \
    --query 'logStreams[0].logStreamName' \
    --output text \
    --region $AWS_REGION)" \
  --region $AWS_REGION \
  --limit 100
```

### View Frontend Logs

In Vercel Dashboard:
1. Go to your project → Deployments
2. Click on a deployment → Functions tab
3. View function logs and errors

Or via CLI:
```bash
vercel logs your-project.vercel.app
```

### Deploy New Backend Version

```bash
# 1. Build and push new image
cd apps/backend
docker buildx build --platform linux/amd64 -t vrem-backend:latest .

# 2. Authenticate with ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# 3. Tag and push
docker tag vrem-backend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/vrem-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/vrem-backend:latest

# 4. Force new deployment
aws ecs update-service \
  --cluster vrem-production \
  --service vrem-backend \
  --force-new-deployment \
  --region $AWS_REGION
```

### Deploy New Frontend Version

Frontend deploys automatically when you push to `main`.

Manual deployment:
```bash
cd apps/frontend
vercel --prod
```

### Scale Backend

```bash
# Scale to 2 tasks
aws ecs update-service \
  --cluster vrem-production \
  --service vrem-backend \
  --desired-count 2 \
  --region $AWS_REGION
```

### Run Database Migrations

```bash
aws ecs run-task \
  --cluster vrem-production \
  --task-definition vrem-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$BACKEND_SG_ID],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"vrem-backend","command":["npx","prisma","migrate","deploy"]}]}' \
  --region $AWS_REGION
```

---

## Troubleshooting

### Backend Won't Start

1. **Check logs:**
```bash
aws logs tail /ecs/vrem-backend --follow --region $AWS_REGION
```

2. **Check task status:**
```bash
TASK_ARN=$(aws ecs list-tasks \
  --cluster vrem-production \
  --service-name vrem-backend \
  --query 'taskArns[0]' \
  --output text \
  --region $AWS_REGION)

aws ecs describe-tasks \
  --cluster vrem-production \
  --tasks $TASK_ARN \
  --region $AWS_REGION
```

3. **Common issues:**
   - Secrets not found: Check IAM role has secrets access
   - Image pull failed: Check ECR repository exists
   - Health check failed: Ensure `/health` endpoint returns 200
   - Database connection failed: Check security groups

### Frontend Build Errors

1. Check build logs in Vercel Dashboard → Deployments
2. Common issues:
   - Missing environment variables
   - TypeScript errors
   - Dependency issues

### Database Connection Issues

```bash
# Verify security group rules
aws ec2 describe-security-groups \
  --group-ids $RDS_SG_ID \
  --region $AWS_REGION

# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier vrem-production \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address}' \
  --region $AWS_REGION
```

---

## Cost Estimates

### Monthly Cost Breakdown

| Service | Configuration | Estimated Cost |
|---------|---------------|----------------|
| **ECS Fargate** | 1 task (0.5 vCPU, 1 GB) | ~$15/month |
| **Application Load Balancer** | Standard, low traffic | ~$20/month |
| **RDS PostgreSQL** | db.t4g.micro, 20 GB | ~$15/month |
| **ECR** | < 1 GB storage | ~$0.10/month |
| **Secrets Manager** | 9 secrets | ~$3.60/month |
| **CloudWatch Logs** | ~5 GB/month | ~$2.50/month |
| **Vercel** | Pro plan (recommended) | $20/month |
| **Vercel** | Hobby plan (free tier) | $0/month |
| **Data Transfer** | Moderate | ~$5-10/month |
| **Total (Pro)** | | **~$80-90/month** |
| **Total (Hobby)** | | **~$60-70/month** |

### Vercel Pricing Notes

- **Hobby (Free)**: Good for personal projects, limited to 100GB bandwidth
- **Pro ($20/month)**: Recommended for production, includes team features, more bandwidth
- Both include unlimited deployments, automatic HTTPS, and edge functions

---

## Quick Reference

### Important URLs

| Resource | URL |
|----------|-----|
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **AWS Console** | https://console.aws.amazon.com/ |
| **ECS Console** | https://console.aws.amazon.com/ecs/ |
| **RDS Console** | https://console.aws.amazon.com/rds/ |
| **Secrets Manager** | https://console.aws.amazon.com/secretsmanager/ |
| **CloudWatch Logs** | https://console.aws.amazon.com/cloudwatch/ |
| **Clerk Dashboard** | https://dashboard.clerk.com/ |
| **Stripe Dashboard** | https://dashboard.stripe.com/ |

### Common Commands Cheat Sheet

```bash
# View backend logs
aws logs tail /ecs/vrem-backend --follow --region us-east-1

# Check backend service status
aws ecs describe-services --cluster vrem-production --services vrem-backend --region us-east-1

# Force backend redeploy
aws ecs update-service --cluster vrem-production --service vrem-backend --force-new-deployment --region us-east-1

# Scale backend
aws ecs update-service --cluster vrem-production --service vrem-backend --desired-count 2 --region us-east-1

# Update a secret
aws secretsmanager put-secret-value --secret-id vrem/secret-name --secret-string "value" --region us-east-1

# Run database migrations
aws ecs run-task --cluster vrem-production --task-definition vrem-backend --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"vrem-backend","command":["npx","prisma","migrate","deploy"]}]}' \
  --region us-east-1

# Deploy frontend (from apps/frontend directory)
vercel --prod

# View frontend logs
vercel logs your-project.vercel.app
```

---

## Security Checklist

Before going live, ensure:

- [ ] All placeholder secrets replaced with real values
- [ ] HTTPS enabled on ALB
- [ ] Custom domain configured in Vercel with SSL
- [ ] RDS not publicly accessible
- [ ] Security groups properly restricted
- [ ] IAM roles follow least privilege
- [ ] MFA enabled on AWS root account
- [ ] Billing alerts configured
- [ ] Backup retention configured for RDS
- [ ] Clerk production keys in use
- [ ] Stripe live keys in use
- [ ] Domain verified in Resend
