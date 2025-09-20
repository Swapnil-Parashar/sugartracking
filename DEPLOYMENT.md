# Vercel Deployment Guide

## Prerequisites

1. A Vercel account (free at [vercel.com](https://vercel.com))
2. Your Google Sheets API credentials
3. A Google Sheets document set up with the required structure

## Google Sheets Setup

Your Google Sheets document should have two sheets:

### Users Sheet (Sheet name: "Users")

Columns: A-F

- A: User ID
- B: Username
- C: Password (hashed)
- D: Name
- E: Age
- F: Gender

### SugarReadings Sheet (Sheet name: "SugarReadings")

Columns: A-E

- A: User ID
- B: Date
- C: Time
- D: Type (fasting/evening/night)
- E: Value

## Environment Variables

Set these environment variables in your Vercel project:

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add the following variables:

```
GOOGLE_SHEETS_ID=your-google-sheets-id
GOOGLE_PROJECT_ID=your-google-project-id
GOOGLE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_PRIVATE_KEY=your-private-key
GOOGLE_CLIENT_EMAIL=your-service-account-email
GOOGLE_CLIENT_ID=your-client-id
```

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:

```bash
npm i -g vercel
```

2. Login to Vercel:

```bash
vercel login
```

3. Deploy:

```bash
vercel
```

### Option 2: Deploy via GitHub

1. Push your code to a GitHub repository
2. Connect your GitHub repository to Vercel
3. Vercel will automatically deploy on every push

### Option 3: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Configure environment variables
5. Deploy

## Post-Deployment

1. Your app will be available at `https://your-project-name.vercel.app`
2. Test the login/signup functionality
3. Verify that data is being saved to Google Sheets

## Troubleshooting

### Common Issues

1. **Environment Variables**: Make sure all Google Sheets API credentials are set correctly
2. **CORS Issues**: The API includes CORS headers for cross-origin requests
3. **Session Storage**: Sessions are stored in memory and will reset on serverless function restarts

### Google Sheets API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Google Sheets API
4. Create a Service Account
5. Download the JSON credentials
6. Share your Google Sheets document with the service account email

## Local Development

To run locally with the same configuration:

1. Create a `.env.local` file with your environment variables
2. Run: `bun run dev`
3. The app will be available at `http://localhost:3000`

## Production Considerations

- Sessions are stored in memory and will reset when serverless functions restart
- For production, consider using a database like Redis for session storage
- Monitor your Google Sheets API quota
- Set up proper error monitoring and logging
