# VREM - AWS Production Deployment Guide

## Architecture Overview

```
Internet
    │
    ▼
Route 53 (DNS)
    │
    ├──► CloudFront ──► S3 (Static Assets)
    │
    ▼
Application Load Balancer
    │
    ├──► AWS Amplify (Frontend - Next.js)
    │
    └──► ECS Fargate (Backend - NestJS)
              │
              ▼
         RDS Aurora PostgreSQL
```

---

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker installed locally
- Domain name (for Route 53)

---

## Step 1: Database Setup (RDS Aurora PostgreSQL)

### Create Aurora Cluster

1. Go to **RDS Console** → **Create database**
2. Choose **Aurora (PostgreSQL Compatible)**
3. Settings:
   - **Engine version**: PostgreSQL 15.x
   - **Instance class**: db.r6g.large (production) or db.t4g.medium (staging)
   - **Multi-AZ**: Yes (production)
   - **Storage**: Aurora auto-scaling

4. Connectivity:
   - **VPC**: Your production VPC
   - **Subnet group**: Private subnets
   - **Public access**: No
   - **Security group**: Allow inbound 5432 from ECS security group

5. Save your credentials:
   ```
   DATABASE_URL=postgresql://username:password@your-cluster.cluster-xxx.region.rds.amazonaws.com:5432/vrem
   ```

---

## Step 2: Backend Deployment (ECS Fargate)

### 2.1 Create ECR Repository

```bash
aws ecr create-repository --repository-name vrem-backend --region us-east-1
```

### 2.2 Build and Push Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
cd apps/backend
docker build -t vrem-backend .

# Tag image
docker tag vrem-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/vrem-backend:latest

# Push image
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/vrem-backend:latest
```

### 2.3 Create ECS Cluster

1. Go to **ECS Console** → **Create Cluster**
2. Choose **Networking only (Fargate)**
3. Name: `vrem-production`

### 2.4 Create Task Definition

Create `task-definition.json`:

```json
{
  "family": "vrem-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "vrem-backend",
      "image": "YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/vrem-backend:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3001"}
      ],
      "secrets": [
        {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:region:account:secret:vrem/database-url"},
        {"name": "CLERK_SECRET_KEY", "valueFrom": "arn:aws:secretsmanager:region:account:secret:vrem/clerk-secret"},
        {"name": "STRIPE_SECRET_KEY", "valueFrom": "arn:aws:secretsmanager:region:account:secret:vrem/stripe-secret"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/vrem-backend",
          "awslogs-region": "us-east-1",
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
```

Register task definition:
```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### 2.5 Create Application Load Balancer

1. Go to **EC2 Console** → **Load Balancers** → **Create**
2. Choose **Application Load Balancer**
3. Settings:
   - **Name**: vrem-backend-alb
   - **Scheme**: Internet-facing
   - **Listeners**: HTTPS (443)
   - **Target group**: Create new (vrem-backend-tg, port 3001, health check /health)

### 2.6 Create ECS Service

```bash
aws ecs create-service \
  --cluster vrem-production \
  --service-name vrem-backend \
  --task-definition vrem-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=vrem-backend,containerPort=3001"
```

---

## Step 3: Frontend Deployment (AWS Amplify)

### 3.1 Connect Repository

1. Go to **AWS Amplify Console**
2. Click **New app** → **Host web app**
3. Connect your GitHub repository
4. Select the `main` branch

### 3.2 Configure Build Settings

Amplify should auto-detect the `amplify.yml` file. If not, use:

- **App root**: `apps/frontend`
- **Build command**: `npm run build`
- **Output directory**: `.next`

### 3.3 Environment Variables

Add these in Amplify Console → **Environment variables**:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx
NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY=xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

### 3.4 Deploy

Click **Save and deploy**. Amplify will build and deploy automatically.

---

## Step 4: DNS & SSL (Route 53)

### 4.1 Create Hosted Zone

1. Go to **Route 53** → **Hosted zones** → **Create**
2. Enter your domain name

### 4.2 Configure Records

| Record | Type | Value |
|--------|------|-------|
| `yourdomain.com` | A | Amplify (alias) |
| `www.yourdomain.com` | CNAME | Amplify domain |
| `api.yourdomain.com` | A | ALB (alias) |

### 4.3 SSL Certificates

1. Go to **ACM (Certificate Manager)**
2. Request public certificate for:
   - `yourdomain.com`
   - `*.yourdomain.com`
3. Validate via DNS (add CNAME records)
4. Attach to ALB and Amplify

---

## Step 5: Secrets Management

### Store Secrets in AWS Secrets Manager

```bash
# Database URL
aws secretsmanager create-secret \
  --name vrem/database-url \
  --secret-string "postgresql://user:pass@host:5432/vrem"

# Clerk Secret
aws secretsmanager create-secret \
  --name vrem/clerk-secret \
  --secret-string "sk_live_xxx"

# Stripe Secret
aws secretsmanager create-secret \
  --name vrem/stripe-secret \
  --secret-string "sk_live_xxx"

# Add more as needed...
```

---

## Step 6: Run Database Migrations

After backend is deployed, run migrations:

```bash
# Option 1: ECS Exec (if enabled)
aws ecs execute-command \
  --cluster vrem-production \
  --task TASK_ID \
  --container vrem-backend \
  --interactive \
  --command "npx prisma migrate deploy"

# Option 2: One-off task
aws ecs run-task \
  --cluster vrem-production \
  --task-definition vrem-backend \
  --launch-type FARGATE \
  --overrides '{"containerOverrides":[{"name":"vrem-backend","command":["npx","prisma","migrate","deploy"]}]}'
```

---

## Environment Variables Checklist

### Backend (ECS/Secrets Manager)
- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`
- [ ] `CLERK_SECRET_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `EMAIL_FROM`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `UPLOADCARE_CDN_BASE`
- [ ] `FRONTEND_URL`
- [ ] `API_URL`

### Frontend (Amplify)
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`
- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN`
- [ ] `NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY`

---

## Monitoring & Logs

### CloudWatch
- Backend logs: `/ecs/vrem-backend`
- Amplify logs: Amplify Console → App → Monitoring

### Alarms (Recommended)
- ECS CPU/Memory utilization > 80%
- ALB 5xx errors > 1%
- RDS connections > 80%

---

## Estimated Monthly Costs

| Service | Sizing | Est. Cost |
|---------|--------|-----------|
| ECS Fargate | 2 tasks, 0.5 vCPU, 1GB | ~$30 |
| RDS Aurora | db.t4g.medium | ~$60 |
| ALB | Standard | ~$20 |
| Amplify | Build + Hosting | ~$5-20 |
| Route 53 | Hosted zone | ~$0.50 |
| Secrets Manager | 10 secrets | ~$4 |
| **Total** | | **~$120-150/mo** |

*Costs scale with traffic. Use AWS Calculator for precise estimates.*

---

## Quick Deploy Commands

```bash
# Build and push backend
cd apps/backend
docker build -t vrem-backend .
docker tag vrem-backend:latest $ECR_REPO:latest
docker push $ECR_REPO:latest

# Force new deployment
aws ecs update-service --cluster vrem-production --service vrem-backend --force-new-deployment

# Check deployment status
aws ecs describe-services --cluster vrem-production --services vrem-backend
```

---

## Support

For issues, check:
1. CloudWatch Logs
2. ECS Task status
3. ALB Target Group health
4. Amplify build logs
