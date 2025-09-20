# Sugar Tracking Application

A simple web application for tracking blood sugar levels with Google Sheets as the backend database.

## Features

- 🔐 User authentication (login/signup)
- 📊 Interactive dashboard with charts
- 📈 Sugar level tracking with different types (fasting, evening, night)
- 📱 Responsive design
- 📋 Data visualization with Chart.js
- 🗄️ Google Sheets integration for data storage

## Setup Instructions

### 1. Install Dependencies

```bash
bun install
```

### 2. Google Sheets Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API
4. Create a Service Account:
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Give it a name and description
   - Click "Create and Continue"
   - Skip the optional steps and click "Done"
5. Create a key for the service account:
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose JSON format and download the key file

### 3. Google Sheets Configuration

1. Create a new Google Sheet
2. Copy the sheet ID from the URL (the long string between `/d/` and `/edit`)
3. Create two sheets in your Google Sheet:
   - **Users sheet** with columns: ID, Username, Password, Name, Age, Gender
   - **SugarReadings sheet** with columns: UserID, Date, Time, Type, Value
4. Share the sheet with your service account email (found in the JSON key file)

### 4. Environment Configuration

1. Copy `env.example` to `.env`
2. Fill in your Google Sheets credentials:

```env
GOOGLE_SHEETS_ID=your-google-sheet-id-here
GOOGLE_PROJECT_ID=your-google-project-id
GOOGLE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----"
GOOGLE_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your-client-id
```

### 5. Run the Application

```bash
# Development mode with hot reload
bun run dev

# Production mode
bun run start
```

The application will be available at `http://localhost:3000`

## Usage

1. **Sign Up**: Create a new account with your details
2. **Login**: Use your credentials to access the dashboard
3. **Add Readings**: Record your blood sugar levels with date, time, and type
4. **View Trends**: See your data visualized in interactive charts
5. **Track Progress**: Monitor your sugar levels over time

## Data Structure

### Users Sheet

- ID: Unique identifier
- Username: Login username
- Password: Hashed password
- Name: Full name
- Age: User's age
- Gender: User's gender

### Sugar Readings Sheet

- UserID: Reference to user
- Date: Date of reading (YYYY-MM-DD)
- Time: Time of reading (HH:MM)
- Type: Reading type (fasting/evening/night)
- Value: Sugar level in mg/dL

## Technology Stack

- **Backend**: Bun runtime
- **Frontend**: HTML, CSS, JavaScript
- **Templates**: EJS
- **Charts**: Chart.js
- **Database**: Google Sheets API
- **Authentication**: bcryptjs for password hashing

## Security Notes

- Passwords are hashed using bcryptjs
- Session management is handled in-memory (consider Redis for production)
- Google Sheets API uses service account authentication
- All user data is stored in your private Google Sheet

## Development

To modify the application:

1. Edit `src/index.ts` for server logic
2. Modify `views/` files for UI changes
3. Update `package.json` for dependencies
4. Restart the server to see changes

## License

MIT License
