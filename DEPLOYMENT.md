# VREM - AWS Production Deployment Guide

## Quick Access Links

### AWS Console Login
1. Go to: https://console.aws.amazon.com/
2. Sign in with your AWS account (Account ID: `741448931302`)
3. Select region: **US East (N. Virginia) us-east-1**

### Direct Resource Links
| Resource | Console Link |
|----------|--------------|
| **ECS Cluster** | https://us-east-1.console.aws.amazon.com/ecs/v2/clusters/vrem-production |
| **ECS Service** | https://us-east-1.console.aws.amazon.com/ecs/v2/clusters/vrem-production/services/vrem-backend |
| **ECR Repository** | https://us-east-1.console.aws.amazon.com/ecr/repositories/private/741448931302/vrem-backend |
| **Load Balancer** | https://us-east-1.console.aws.amazon.com/ec2/home#LoadBalancers:search=vrem-backend-alb |
| **Secrets Manager** | https://us-east-1.console.aws.amazon.com/secretsmanager/listsecrets?region=us-east-1&search=vrem |
| **CloudWatch Logs** | https://us-east-1.console.aws.amazon.com/cloudwatch/home#logsV2:log-groups/log-group/$252Fecs$252Fvrem-backend |
| **Amplify App** | https://us-east-1.console.aws.amazon.com/amplify/apps/d7y2o55px1hva |

---

## Current Deployment Status

### Backend (ECS Fargate) - RUNNING
- **Health Check**: http://vrem-backend-alb-287667160.us-east-1.elb.amazonaws.com/health
- **API Endpoint**: http://vrem-backend-alb-287667160.us-east-1.elb.amazonaws.com
- **Status**: Running with placeholder secrets (needs real credentials)

### Frontend (Amplify) - PENDING GITHUB CONNECTION
- **App ID**: `d7y2o55px1hva`
- **URL** (after connection): https://main.d7y2o55px1hva.amplifyapp.com
- **Status**: Needs GitHub repository connection for SSR deployment

---

## Architecture Overview

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                         Route 53                             │
│                    (DNS - to be configured)                  │
└─────────────────────────────────────────────────────────────┘
    │                                    │
    ▼                                    ▼
┌──────────────────────┐    ┌──────────────────────────────────┐
│    AWS Amplify       │    │   Application Load Balancer      │
│  (Next.js Frontend)  │    │   vrem-backend-alb               │
│                      │    │   (Internet-facing, HTTP:80)     │
│  App: d7y2o55px1hva │    └──────────────────────────────────┘
└──────────────────────┘                 │
                                         ▼
                          ┌──────────────────────────────────┐
                          │        ECS Fargate               │
                          │   Cluster: vrem-production       │
                          │   Service: vrem-backend          │
                          │   Task: vrem-backend:2           │
                          │   Port: 3001                     │
                          └──────────────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
           ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
           │   Secrets    │    │  CloudWatch  │    │     RDS      │
           │   Manager    │    │    Logs      │    │   (needed)   │
           └──────────────┘    └──────────────┘    └──────────────┘
```

---

## Deployed AWS Resources

### Backend Infrastructure

| Resource | ID/ARN | Details |
|----------|--------|---------|
| **ECS Cluster** | `vrem-production` | Fargate capacity provider |
| **ECS Service** | `vrem-backend` | 1 desired task, Fargate launch type |
| **Task Definition** | `vrem-backend:1` | 512 CPU, 1024 MB memory |
| **ECR Repository** | `vrem-backend` | `741448931302.dkr.ecr.us-east-1.amazonaws.com/vrem-backend` |
| **ALB** | `vrem-backend-alb` | DNS: `vrem-backend-alb-287667160.us-east-1.elb.amazonaws.com` |
| **Target Group** | `vrem-backend-tg` | Port 3001, HTTP health check on `/health` |
| **Security Group (Backend)** | `sg-0c514d127d9d19687` | Allows 3001 from ALB |
| **Security Group (ALB)** | `sg-0aae833a443bc0cc2` | Allows 80 from anywhere |
| **IAM Role** | `vrem-ecs-task-execution-role` | ECS task execution + Secrets Manager access |
| **Log Group** | `/ecs/vrem-backend` | Backend application logs |

### Secrets Manager Secrets

| Secret Name | ARN | Status |
|-------------|-----|--------|
| `vrem/database-url` | `arn:aws:secretsmanager:us-east-1:741448931302:secret:vrem/database-url-GDuAsy` | PLACEHOLDER - needs real value |
| `vrem/jwt-secret` | `arn:aws:secretsmanager:us-east-1:741448931302:secret:vrem/jwt-secret-mCvO5Z` | PLACEHOLDER - needs real value |
| `vrem/clerk-secret` | `arn:aws:secretsmanager:us-east-1:741448931302:secret:vrem/clerk-secret-VOpDtL` | PLACEHOLDER - needs real value |
| `vrem/stripe-secret` | `arn:aws:secretsmanager:us-east-1:741448931302:secret:vrem/stripe-secret-6ryaay` | PLACEHOLDER - needs real value |
| `vrem/stripe-webhook-secret` | `arn:aws:secretsmanager:us-east-1:741448931302:secret:vrem/stripe-webhook-secret-UGIkJ6` | PLACEHOLDER - needs real value |
| `vrem/resend-api-key` | `arn:aws:secretsmanager:us-east-1:741448931302:secret:vrem/resend-api-key-qBpt9g` | PLACEHOLDER - needs real value |
| `vrem/uploadcare-public-key` | `arn:aws:secretsmanager:us-east-1:741448931302:secret:vrem/uploadcare-public-key-EZqKzo` | PLACEHOLDER - needs real value |
| `vrem/uploadcare-private-key` | `arn:aws:secretsmanager:us-east-1:741448931302:secret:vrem/uploadcare-private-key-3Spbhj` | PLACEHOLDER - needs real value |
| `vrem/uploadcare-cdn-base` | `arn:aws:secretsmanager:us-east-1:741448931302:secret:vrem/uploadcare-cdn-base-EwoxLi` | PLACEHOLDER - needs real value |

### Frontend Infrastructure

| Resource | ID/ARN | Details |
|----------|--------|---------|
| **Amplify App** | `d7y2o55px1hva` | Platform: WEB_COMPUTE (SSR) |
| **Branch** | `main` | Production stage |
| **Default Domain** | `d7y2o55px1hva.amplifyapp.com` | |

---

## STEP 1: Complete Frontend Setup (Required)

The frontend needs to be connected to GitHub for SSR deployment:

1. **Go to Amplify Console**: https://us-east-1.console.aws.amazon.com/amplify/apps/d7y2o55px1hva

2. **Connect to GitHub**:
   - Click "Hosting" in the left sidebar
   - Click "Connect repository" or "Deploy without Git" → "Connect different repository"
   - Choose GitHub and authorize AWS Amplify
   - Select repository: `duropiri/vrem`
   - Select branch: `main`

3. **Configure Build Settings**:
   - Set **App root**: `apps/frontend`
   - The `amplify.yml` in the repo will be auto-detected

4. **Verify Environment Variables** (already configured):
   - Go to "Hosting" → "Environment variables"
   - Update the PLACEHOLDER values with real keys

5. **Save and Deploy**

---

## STEP 2: Update Secrets with Real Values (Required)

Update each secret in AWS Secrets Manager with your actual credentials:

### Via AWS Console:
1. Go to: https://us-east-1.console.aws.amazon.com/secretsmanager/listsecrets
2. Click on each `vrem/*` secret
3. Click "Retrieve secret value" → "Edit"
4. Enter your real value and save

### Via AWS CLI:
```bash
# Database URL (after creating RDS)
aws secretsmanager put-secret-value \
  --secret-id vrem/database-url \
  --secret-string "postgresql://user:password@your-rds-endpoint:5432/vrem" \
  --region us-east-1

# JWT Secret (generate a secure random string)
aws secretsmanager put-secret-value \
  --secret-id vrem/jwt-secret \
  --secret-string "$(openssl rand -base64 32)" \
  --region us-east-1

# Clerk Secret Key (from https://dashboard.clerk.com)
aws secretsmanager put-secret-value \
  --secret-id vrem/clerk-secret \
  --secret-string "sk_live_YOUR_CLERK_SECRET" \
  --region us-east-1

# Stripe Secret Key (from https://dashboard.stripe.com/apikeys)
aws secretsmanager put-secret-value \
  --secret-id vrem/stripe-secret \
  --secret-string "sk_live_YOUR_STRIPE_SECRET" \
  --region us-east-1

# Stripe Webhook Secret (from Stripe webhook settings)
aws secretsmanager put-secret-value \
  --secret-id vrem/stripe-webhook-secret \
  --secret-string "whsec_YOUR_WEBHOOK_SECRET" \
  --region us-east-1

# Resend API Key (from https://resend.com/api-keys)
aws secretsmanager put-secret-value \
  --secret-id vrem/resend-api-key \
  --secret-string "re_YOUR_RESEND_KEY" \
  --region us-east-1

# Uploadcare Public Key (from https://uploadcare.com/dashboard)
aws secretsmanager put-secret-value \
  --secret-id vrem/uploadcare-public-key \
  --secret-string "YOUR_UPLOADCARE_PUBLIC_KEY" \
  --region us-east-1

# Uploadcare Private Key
aws secretsmanager put-secret-value \
  --secret-id vrem/uploadcare-private-key \
  --secret-string "YOUR_UPLOADCARE_PRIVATE_KEY" \
  --region us-east-1
```

After updating secrets, force a new deployment:
```bash
aws ecs update-service --cluster vrem-production --service vrem-backend --force-new-deployment --region us-east-1
```

---

## STEP 3: Create RDS Database (Required)

The backend needs a PostgreSQL database:

### Option A: Via Console
1. Go to: https://us-east-1.console.aws.amazon.com/rds/home#launch-dbinstance:
2. Choose **Aurora (PostgreSQL Compatible)** or **PostgreSQL**
3. Settings:
   - **DB instance identifier**: `vrem-production`
   - **Master username**: `vrem_admin`
   - **Master password**: (generate secure password)
   - **DB instance class**: `db.t4g.micro` (free tier) or `db.t4g.medium`
   - **Storage**: 20 GB (auto-scaling enabled)
4. Connectivity:
   - **VPC**: Default VPC (`vpc-0842811750dee8e2b`)
   - **Public access**: Yes (for initial setup, change to No later)
   - **Security group**: Create new, allow 5432 from backend security group
5. Create database
6. Once created, update the `vrem/database-url` secret with:
   ```
   postgresql://vrem_admin:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/vrem
   ```

### Option B: Via CLI
```bash
aws rds create-db-instance \
  --db-instance-identifier vrem-production \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username vrem_admin \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-0c514d127d9d19687 \
  --region us-east-1
```

---

## STEP 4: Run Database Migrations

After database is created and secrets are updated:

```bash
# Option 1: Run as a one-off ECS task
aws ecs run-task \
  --cluster vrem-production \
  --task-definition vrem-backend:1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-09c75d92478746a1f,subnet-01fe44f3919f1fcb4],securityGroups=[sg-0c514d127d9d19687],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"vrem-backend","command":["npx","prisma","migrate","deploy"]}]}' \
  --region us-east-1

# Option 2: Connect to running container (requires ECS Exec enabled)
# First, get the task ID
TASK_ID=$(aws ecs list-tasks --cluster vrem-production --service-name vrem-backend --query 'taskArns[0]' --output text --region us-east-1 | cut -d'/' -f3)

aws ecs execute-command \
  --cluster vrem-production \
  --task $TASK_ID \
  --container vrem-backend \
  --interactive \
  --command "/bin/sh" \
  --region us-east-1
```

---

## Daily Operations

### View Backend Logs
```bash
# Stream logs in real-time
aws logs tail /ecs/vrem-backend --follow --region us-east-1

# View recent logs
aws logs get-log-events \
  --log-group-name /ecs/vrem-backend \
  --log-stream-name "$(aws logs describe-log-streams --log-group-name /ecs/vrem-backend --order-by LastEventTime --descending --limit 1 --region us-east-1 --query 'logStreams[0].logStreamName' --output text)" \
  --region us-east-1 \
  --limit 50
```

### Check Service Health
```bash
# ECS service status
aws ecs describe-services --cluster vrem-production --services vrem-backend --region us-east-1 \
  --query 'services[0].{status:status,running:runningCount,desired:desiredCount,pending:pendingCount}'

# Health endpoint
curl http://vrem-backend-alb-287667160.us-east-1.elb.amazonaws.com/health

# Target group health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:741448931302:targetgroup/vrem-backend-tg/223e475fd3c01cd7 \
  --region us-east-1
```

### Deploy New Backend Version
```bash
# 1. Build new image (from apps/backend directory)
cd apps/backend
docker buildx build --platform linux/amd64 -t vrem-backend:latest .

# 2. Authenticate with ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 741448931302.dkr.ecr.us-east-1.amazonaws.com

# 3. Tag and push
docker tag vrem-backend:latest 741448931302.dkr.ecr.us-east-1.amazonaws.com/vrem-backend:latest
docker push 741448931302.dkr.ecr.us-east-1.amazonaws.com/vrem-backend:latest

# 4. Force new deployment
aws ecs update-service --cluster vrem-production --service vrem-backend --force-new-deployment --region us-east-1

# 5. Monitor deployment
watch -n 5 'aws ecs describe-services --cluster vrem-production --services vrem-backend --region us-east-1 --query "services[0].{running:runningCount,pending:pendingCount,desired:desiredCount}"'
```

### Deploy New Frontend Version
Once connected to GitHub, deployments are automatic on push to `main`.

Manual trigger:
```bash
aws amplify start-job --app-id d7y2o55px1hva --branch-name main --job-type RELEASE --region us-east-1
```

### Scale Backend
```bash
# Scale to 2 tasks
aws ecs update-service --cluster vrem-production --service vrem-backend --desired-count 2 --region us-east-1

# Scale down to 1 task
aws ecs update-service --cluster vrem-production --service vrem-backend --desired-count 1 --region us-east-1
```

### Restart Backend (Rolling)
```bash
aws ecs update-service --cluster vrem-production --service vrem-backend --force-new-deployment --region us-east-1
```

---

## Environment Variables Reference

### Backend (ECS Task Definition via Secrets Manager)
| Variable | Secret Name | Source |
|----------|-------------|--------|
| `DATABASE_URL` | `vrem/database-url` | RDS connection string |
| `JWT_SECRET` | `vrem/jwt-secret` | Generated random string |
| `CLERK_SECRET_KEY` | `vrem/clerk-secret` | Clerk Dashboard |
| `STRIPE_SECRET_KEY` | `vrem/stripe-secret` | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | `vrem/stripe-webhook-secret` | Stripe Webhooks |
| `RESEND_API_KEY` | `vrem/resend-api-key` | Resend Dashboard |
| `UPLOADCARE_PUBLIC_KEY` | `vrem/uploadcare-public-key` | Uploadcare Dashboard |
| `UPLOADCARE_PRIVATE_KEY` | `vrem/uploadcare-private-key` | Uploadcare Dashboard |
| `UPLOADCARE_CDN_BASE` | `vrem/uploadcare-cdn-base` | `https://ucarecdn.com` |

### Backend (ECS Task Definition - Environment)
| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `FRONTEND_URL` | `https://vrem.yourdomain.com` (update after DNS) |
| `API_URL` | `http://vrem-backend-alb-287667160.us-east-1.elb.amazonaws.com` |

### Frontend (Amplify Environment Variables)
| Variable | Value | Source |
|----------|-------|--------|
| `NEXT_PUBLIC_API_URL` | `http://vrem-backend-alb-287667160.us-east-1.elb.amazonaws.com` | ALB DNS |
| `NEXT_PUBLIC_USE_PRODUCTION_API` | `true` | |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_xxx` | Clerk Dashboard |
| `CLERK_SECRET_KEY` | `sk_live_xxx` | Clerk Dashboard |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` | |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/signup` | |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` | |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` | |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `pk.xxx` | Mapbox Dashboard |
| `NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY` | `xxx` | Uploadcare Dashboard |

---

## Troubleshooting

### Backend Won't Start
1. **Check logs**: https://us-east-1.console.aws.amazon.com/cloudwatch/home#logsV2:log-groups/log-group/$252Fecs$252Fvrem-backend
2. **Check task status**:
   ```bash
   aws ecs describe-tasks --cluster vrem-production \
     --tasks $(aws ecs list-tasks --cluster vrem-production --service-name vrem-backend --query 'taskArns[0]' --output text --region us-east-1) \
     --region us-east-1
   ```
3. **Common issues**:
   - Database not reachable: Check RDS security group allows connections from ECS
   - Missing secrets: Ensure all secrets have real values (not PLACEHOLDER)
   - Health check failing: Ensure `/health` endpoint returns 200

### Frontend 404 Error
- Amplify needs to be connected to GitHub for SSR
- Check build logs in Amplify Console
- Verify environment variables are set

### Database Connection Issues
```bash
# Test from a task with execute-command
aws ecs execute-command \
  --cluster vrem-production \
  --task TASK_ID \
  --container vrem-backend \
  --interactive \
  --command "npx prisma db pull" \
  --region us-east-1
```

---

## Cost Management

### Current Resources Cost Estimate
| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| ECS Fargate | 1 task (0.5 vCPU, 1GB) | ~$15 |
| ALB | Standard | ~$20 |
| ECR | < 1GB storage | ~$0.10 |
| Secrets Manager | 9 secrets | ~$3.60 |
| CloudWatch Logs | ~5GB/month | ~$2.50 |
| Amplify Hosting | SSR compute | ~$5-20 |
| RDS (when added) | db.t4g.micro | ~$15 |
| **Total** | | **~$60-80/mo** |

### Cost Optimization Tips
- Use Fargate Spot for non-critical workloads (70% savings)
- Set up CloudWatch log retention (7-30 days)
- Use RDS reserved instances for 1-year commitment (30% savings)

---

## Security Checklist

- [ ] Update all placeholder secrets with real values
- [ ] Enable HTTPS on ALB (requires ACM certificate)
- [ ] Restrict RDS to private subnets only
- [ ] Enable VPC Flow Logs for network monitoring
- [ ] Set up AWS CloudTrail for audit logging
- [ ] Configure IAM roles with least privilege
- [ ] Enable MFA on AWS root account
- [ ] Set up billing alerts

---

## Next Steps

1. **Immediate** (Required for app to work):
   - [ ] Connect Amplify to GitHub
   - [ ] Create RDS database
   - [ ] Update all secrets with real values
   - [ ] Run database migrations

2. **Soon** (Production readiness):
   - [ ] Set up custom domain with Route 53
   - [ ] Configure SSL certificates with ACM
   - [ ] Enable HTTPS on ALB
   - [ ] Set up CloudWatch alarms
   - [ ] Configure auto-scaling

3. **Later** (Optimization):
   - [ ] Set up CI/CD pipeline
   - [ ] Configure staging environment
   - [ ] Set up backup strategy for RDS
   - [ ] Implement WAF for security
