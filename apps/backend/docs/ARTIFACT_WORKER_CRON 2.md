# Artifact Worker Cron Setup

The artifact worker processes "Download All" requests by generating ZIP archives of project media. In serverless deployments where a persistent background worker may not be available, you can trigger artifact processing via an external scheduler.

## Endpoint

```
POST /delivery/admin/run-artifact-worker
```

### Authentication

Requires `X-CRON-SECRET` header with value matching the `CRON_SECRET` environment variable.

### Response

```json
{
  "success": true,
  "processed": 1,
  "recovered": 0
}
```

- `processed`: Number of artifacts moved from PENDING to GENERATING/READY
- `recovered`: Number of stuck GENERATING artifacts reset for retry

## Environment Variable

Add to your deployment environment:

```bash
CRON_SECRET=your-secure-random-string-here
```

Generate a secure secret:
```bash
openssl rand -hex 32
```

## Scheduler Examples

### GitHub Actions

```yaml
# .github/workflows/artifact-worker-cron.yml
name: Artifact Worker Cron

on:
  schedule:
    # Run every minute
    - cron: '* * * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  trigger-worker:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger artifact worker
        run: |
          curl -sf -X POST "${{ secrets.API_URL }}/delivery/admin/run-artifact-worker" \
            -H "X-CRON-SECRET: ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

Required secrets:
- `API_URL`: Your backend URL (e.g., `https://api.example.com`)
- `CRON_SECRET`: Same value as `CRON_SECRET` env var

### Render Cron Jobs

In your `render.yaml`:

```yaml
services:
  - type: cron
    name: artifact-worker-cron
    schedule: "* * * * *"  # Every minute
    buildCommand: ""
    startCommand: |
      curl -sf -X POST "$API_URL/delivery/admin/run-artifact-worker" \
        -H "X-CRON-SECRET: $CRON_SECRET"
    envVars:
      - key: API_URL
        fromService:
          type: web
          name: backend
          property: host
      - key: CRON_SECRET
        fromGroup: production-secrets
```

### Railway Cron

Create a cron service with:

```bash
curl -sf -X POST "$API_URL/delivery/admin/run-artifact-worker" \
  -H "X-CRON-SECRET: $CRON_SECRET"
```

### Vercel Cron (via API Route)

In `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/artifact-worker",
    "schedule": "* * * * *"
  }]
}
```

Create `/api/cron/artifact-worker.ts`:
```typescript
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  const response = await fetch(`${process.env.API_URL}/delivery/admin/run-artifact-worker`, {
    method: 'POST',
    headers: { 'X-CRON-SECRET': process.env.CRON_SECRET },
  });

  const data = await response.json();
  return res.status(200).json(data);
}
```

### Simple cURL (for testing)

```bash
curl -X POST https://api.example.com/delivery/admin/run-artifact-worker \
  -H "X-CRON-SECRET: your-secret-here"
```

## Recommended Frequency

- **Minimum**: Every 60 seconds
- **Recommended**: Every 30 seconds for faster artifact generation
- **Maximum useful**: Every 5 seconds (rate limited to 12/minute)

## Rate Limiting

The endpoint is rate-limited to 12 requests per minute per IP. Requests beyond this limit will receive a 429 response.

## Security Notes

1. **Never expose `CRON_SECRET`** in client-side code or public logs
2. The endpoint returns 404 for both missing and invalid secrets (timing-safe)
3. Failed authentication attempts are logged without exposing secrets
4. When `CRON_SECRET` is not set, the endpoint is completely disabled (returns 404)

## Monitoring

Check your backend logs for:
- `artifact_worker_cron_success` - Successful cron runs with processed/recovered counts
- `artifact_worker_cron_auth_failed` - Failed authentication attempts

## Fallback: Persistent Worker

If your deployment supports persistent processes, the artifact worker runs automatically in the background (polling every 5 seconds). The cron endpoint is not required in this case but can be used as a backup.
