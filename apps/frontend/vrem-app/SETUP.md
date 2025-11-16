# VX Media Setup Instructions

## Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Google Maps (Required)

#### Get API Key:
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Go to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **API Key**
5. Copy your API key

#### Enable Required APIs:
In the Google Cloud Console, enable these APIs:
- Maps JavaScript API
- Places API  
- Geocoding API

#### Add to Environment:
Create `.env.local` in the vrem-app root:
```bash
echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE" > .env.local
```

Replace `YOUR_API_KEY_HERE` with your actual API key.

### 3. Run the App
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 4. Test the Features

1. Click "Log In" (uses demo authentication)
2. Use the "Demo Mode" dropdown to switch between roles:
   - **Agent**: Book photo shoots and view jobs
   - **Dispatcher**: Assign photographers and manage operations
   - **Photographer**: View jobs and manage profile

## 🎯 Key Features to Try

### As an Agent:
1. Click "New Booking"
2. Type an address (try "1600 Amphitheatre Parkway, Mountain View" or "CN Tower, Toronto")
3. Select from Google autocomplete suggestions (USA & Canada supported)
4. Fill in shoot details
5. See AI-ranked photographers
6. View your jobs in "My Jobs"

### As a Dispatcher:
1. View the dashboard with metrics and map
2. Click "Find Photographer" on pending jobs
3. See AI rankings with scores
4. Assign photographers
5. Check the audit log

### As a Photographer:
1. View upcoming shoots
2. Edit your profile and services
3. Browse and apply to media companies

## ⚠️ Important Notes

- **Google Maps API**: The address search won't work without a valid API key
- **Demo Data**: All data is mocked - no backend required for demo
- **Free Tier**: Google provides $200/month free credit (plenty for development)

## 🎨 Customization

### Change Theme Colors
Edit `app/globals.css` - modify CSS variables in `:root` and `.dark` sections.

### Add New Features
See `components/README.md` for the component structure and organization.

## 📞 Need Help?

- [Google Maps Setup Guide](./GOOGLE_MAPS_SETUP.md) - Detailed Google Maps configuration
- [Component Documentation](./components/README.md) - Component structure guide

