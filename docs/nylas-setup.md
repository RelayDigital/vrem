# Nylas Calendar Integration Setup

This guide walks you through setting up Nylas calendar integration for VREM. Nylas provides a unified API for connecting to Google Calendar and Microsoft Outlook.

## Overview

The Nylas integration enables:
- **OAuth Calendar Connection** - Users connect their Google or Microsoft calendars
- **Two-way Event Sync** - Jobs automatically sync to connected calendars
- **Availability Checking** - Order creation checks external calendar busy times
- **Conflict Detection** - External changes flag projects for review

## Prerequisites

- A Nylas account (sign up at [dashboard.nylas.com](https://dashboard.nylas.com))
- Your application's backend running and accessible
- HTTPS enabled for production (required for OAuth callbacks)

## Step 1: Create a Nylas Application

1. Go to [Nylas Dashboard](https://dashboard.nylas.com)
2. Click **Create Application**
3. Fill in your application details:
   - **Name**: VREM (or your app name)
   - **Description**: Real estate media management platform
4. Note your **Client ID** - you'll need this for the environment variables

## Step 2: Configure OAuth Credentials

### For Google Calendar

1. In Nylas Dashboard, go to **Authentication** > **Google**
2. You'll need to create a Google Cloud project:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable the **Google Calendar API**
   - Configure **OAuth consent screen**:
     - User Type: External (or Internal for Workspace)
     - App name, logo, and developer contact
     - Scopes: `calendar.readonly`, `calendar.events`
   - Create **OAuth 2.0 Client ID**:
     - Application type: Web application
     - Authorized redirect URIs: Add the Nylas callback URL shown in Nylas Dashboard
3. Copy the Google Client ID and Secret to Nylas Dashboard

### For Microsoft Outlook

1. In Nylas Dashboard, go to **Authentication** > **Microsoft**
2. Create an Azure AD application:
   - Go to [Azure Portal](https://portal.azure.com) > Azure Active Directory
   - App registrations > New registration
   - Name: VREM Calendar Integration
   - Supported account types: Accounts in any organizational directory and personal Microsoft accounts
   - Redirect URI: Add the Nylas callback URL shown in Nylas Dashboard
3. Configure API permissions:
   - Calendars.ReadWrite
   - offline_access
   - openid
   - User.Read
4. Create a client secret and copy both Client ID and Secret to Nylas Dashboard

## Step 3: Configure Callback URL

In Nylas Dashboard, go to **Authentication** > **Callback URIs**:

Add your callback URL:
```
https://your-api-domain.com/nylas/oauth/callback
```

For local development:
```
http://localhost:3001/nylas/oauth/callback
```

## Step 4: Get API Key

1. In Nylas Dashboard, go to **API Keys**
2. Click **Generate New Key**
3. Copy the API key (it's only shown once)

## Step 5: Configure Environment Variables

Add these to your backend `.env` file:

```env
# Nylas Configuration
NYLAS_CLIENT_ID="your-client-id-from-dashboard"
NYLAS_API_KEY="nyk_v0_your-api-key"
NYLAS_API_URI="https://api.us.nylas.com"

# For webhook signature verification (optional but recommended)
NYLAS_WEBHOOK_SECRET="your-webhook-secret"
```

### API URI by Region

- **US**: `https://api.us.nylas.com`
- **EU**: `https://api.eu.nylas.com`

Choose based on where your users are located for data residency compliance.

## Step 6: Set Up Webhooks (Optional)

Webhooks notify your app when calendar events change externally.

1. In Nylas Dashboard, go to **Webhooks**
2. Click **Create Webhook**
3. Configure:
   - **Webhook URL**: `https://your-api-domain.com/nylas/webhooks`
   - **Triggers**: Select `event.created`, `event.updated`, `event.deleted`, `grant.expired`
4. Copy the **Webhook Secret** and add it to your environment variables

### Webhook Endpoint

The backend exposes these webhook endpoints:
- `POST /nylas/webhooks` - Receives webhook events
- `GET /nylas/webhooks` - Handles Nylas challenge verification

## Step 7: Test the Integration

### 1. Check Configuration

The backend exposes an endpoint to verify Nylas is configured:

```bash
curl http://localhost:3001/nylas/configured
```

Should return:
```json
{ "configured": true }
```

### 2. Connect a Calendar

1. Log in to VREM
2. Go to **Settings** > **Calendar**
3. Scroll to **Connected Calendars**
4. Click **Connect Calendar**
5. Choose Google or Microsoft
6. Complete the OAuth flow
7. You should be redirected back to settings with the calendar connected

### 3. Verify Sync

1. Create a project with a scheduled time
2. Assign a technician who has a connected calendar
3. Check the technician's external calendar - the event should appear

## API Endpoints Reference

### OAuth Flow
- `GET /nylas/oauth/start?provider=google|microsoft` - Start OAuth (returns redirect URL)
- `GET /nylas/oauth/callback` - OAuth callback handler

### Connection Management
- `GET /nylas/connection` - Get connection status
- `DELETE /nylas/connection/:integrationId` - Disconnect calendar
- `GET /nylas/configured` - Check if Nylas is configured

### Calendars
- `GET /nylas/calendars` - List user's calendars
- `PATCH /nylas/calendars/:integrationId/write-target` - Set write target calendar

### Availability
- `GET /nylas/availability` - Get available time slots
  - Query params: `start`, `end`, `durationMins`, `timezone`, `technicianId`

### Project Sync
- `GET /nylas/projects/:projectId/sync-status` - Get sync status
- `POST /nylas/projects/:projectId/reconcile` - Re-sync project event

## Troubleshooting

### OAuth Errors

**"OAuth callback missing code or state"**
- Ensure callback URL in Nylas Dashboard matches exactly
- Check that the state parameter is being preserved

**"Failed to exchange code for token"**
- Verify NYLAS_CLIENT_ID and NYLAS_API_KEY are correct
- Check that OAuth credentials (Google/Microsoft) are properly configured

### Sync Issues

**Events not appearing on calendar**
- Verify the technician has a connected calendar with "write target" set
- Check the calendar isn't read-only
- Look at backend logs for sync errors

**"Calendar conflict" flag on project**
- Someone modified the event externally
- Review the change and click "Reconcile" to re-sync

### Webhook Issues

**Webhooks not receiving events**
- Verify webhook URL is publicly accessible (HTTPS required)
- Check webhook secret matches environment variable
- Ensure webhook triggers are enabled in Nylas Dashboard

## Architecture Notes

### Database Models

- `UserCalendarIntegration` - Stores OAuth tokens and calendar preferences
- `CalendarEvent` - Links projects to external calendar events
- `Project.calendarConflict` - Flags when external changes detected

### Services

- `NylasService` - Core Nylas API wrapper
- `CalendarSyncService` - Handles project-to-calendar sync logic

### Integration Points

1. **Order Creation** (`orders.service.ts`)
   - Checks availability via Nylas before booking
   - Syncs event after project creation

2. **Project Updates** (`projects.service.ts`)
   - Syncs on technician assignment
   - Updates event on schedule change
   - Removes event on cancellation/deletion

3. **Webhooks** (`nylas.controller.ts`)
   - Handles external event changes
   - Flags conflicts for review

## Security Considerations

1. **Token Storage**: OAuth tokens are stored in the database. Consider encrypting sensitive fields for production.

2. **Webhook Verification**: Always verify webhook signatures using `NYLAS_WEBHOOK_SECRET`.

3. **Scopes**: Request minimal necessary scopes (calendar read/write only, no email access).

4. **User Consent**: Users explicitly connect their calendars; no automatic access.

## Support

- [Nylas Documentation](https://developer.nylas.com/docs/)
- [Nylas API Reference](https://developer.nylas.com/docs/api/)
- [Nylas Community](https://community.nylas.com/)
