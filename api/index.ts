import { google } from "googleapis";
import bcrypt from "bcryptjs";

// Google Sheets configuration
const SHEETS_ID = process.env.GOOGLE_SHEETS_ID || "your-sheet-id";
const CREDENTIALS = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID || "your-project-id",
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID || "your-private-key-id",
  private_key:
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n") || "your-private-key",
  client_email: process.env.GOOGLE_CLIENT_EMAIL || "your-client-email",
  client_id: process.env.GOOGLE_CLIENT_ID || "your-client-id",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${
    process.env.GOOGLE_CLIENT_EMAIL || "your-client-email"
  }`,
};

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// In-memory session storage (in production, use Redis or database)
const sessions = new Map<string, { userId: string; username: string }>();

// Helper functions for Google Sheets operations
async function getUserByUsername(username: string) {
  try {
    console.log("Attempting to get user:", username);
    console.log("Using SHEETS_ID:", SHEETS_ID);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: "Users!A:F",
    });

    const rows = response.data.values || [];
    const userRow = rows.find((row: any[]) => row[1] === username);

    if (userRow) {
      return {
        id: userRow[0],
        username: userRow[1],
        password: userRow[2],
        name: userRow[3],
        age: userRow[4],
        gender: userRow[5],
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}

async function createUser(userData: any) {
  try {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const userId = Date.now().toString();

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEETS_ID,
      range: "Users!A:F",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            userId,
            userData.username,
            hashedPassword,
            userData.name,
            userData.age,
            userData.gender,
          ],
        ],
      },
    });

    return { id: userId, ...userData, password: hashedPassword };
  } catch (error) {
    console.error("Error creating user:", error);
    return null;
  }
}

async function addSugarReading(userId: string, reading: any) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEETS_ID,
      range: "SugarReadings!A:E",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [userId, reading.date, reading.time, reading.type, reading.value],
        ],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding sugar reading:", error);
    return false;
  }
}

async function getSugarReadings(userId: string) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: "SugarReadings!A:E",
    });

    const rows = response.data.values || [];
    return rows
      .filter((row: any[]) => row[0] === userId)
      .map((row: any[]) => ({
        date: row[1],
        time: row[2],
        type: row[3],
        value: parseFloat(row[4]),
      }));
  } catch (error) {
    console.error("Error getting sugar readings:", error);
    return [];
  }
}

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url, `https://${req.headers.host}`);
  const method = req.method;

  try {
    // API Routes
    if (url.pathname === "/api/user" && method === "GET") {
      const sessionId = url.searchParams.get("session");
      if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const session = sessions.get(sessionId)!;
      return res.status(200).json(session);
    }

    if (url.pathname === "/api/readings" && method === "GET") {
      const sessionId = url.searchParams.get("session");
      if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const session = sessions.get(sessionId)!;
      const readings = await getSugarReadings(session.userId);
      return res.status(200).json(readings);
    }

    if (url.pathname === "/api/login" && method === "POST") {
      const { username, password } = req.body;

      const user = await getUserByUsername(username);
      if (user && (await bcrypt.compare(password, user.password))) {
        const sessionId = Math.random().toString(36).substring(2);
        sessions.set(sessionId, { userId: user.id, username: user.username });

        return res.status(200).json({
          sessionId,
          user: { userId: user.id, username: user.username },
        });
      }

      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (url.pathname === "/api/signup" && method === "POST") {
      const { username, password, name, age, gender } = req.body;

      const existingUser = await getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const newUser = await createUser({
        username,
        password,
        name,
        age,
        gender,
      });
      if (newUser) {
        const sessionId = Math.random().toString(36).substring(2);
        sessions.set(sessionId, {
          userId: newUser.id,
          username: newUser.username,
        });

        return res.status(200).json({
          sessionId,
          user: { userId: newUser.id, username: newUser.username },
        });
      }

      return res.status(500).json({ error: "Failed to create account" });
    }

    if (url.pathname === "/api/readings" && method === "POST") {
      const { session, date, time, type, value } = req.body;

      if (!session || !sessions.has(session)) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const sessionData = sessions.get(session)!;
      const reading = { date, time, type, value };

      const success = await addSugarReading(sessionData.userId, reading);
      if (success) {
        return res.status(200).json({ success: true });
      }

      return res.status(500).json({ error: "Failed to add reading" });
    }

    if (url.pathname === "/api/logout" && method === "POST") {
      const sessionId = url.searchParams.get("session");
      if (sessionId && sessions.has(sessionId)) {
        sessions.delete(sessionId);
      }
      return res.status(200).json({ success: true });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
