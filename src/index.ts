import { serve } from "bun";
import { google } from "googleapis";
import bcrypt from "bcryptjs";
import path from "path";

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

// Helper function to set CORS headers
function setCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin");

  // Define allowed origins
  const allowedOrigins = [
    "https://sugartracking.vercel.app",
    "http://localhost:3000",
    "https://localhost:3000",
  ];

  // Check if the origin is allowed
  const allowedOrigin = allowedOrigins.includes(origin || "")
    ? origin
    : "https://sugartracking.vercel.app";

  return {
    "Access-Control-Allow-Origin":
      allowedOrigin || "https://sugartracking.vercel.app",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Helper functions for Google Sheets operations
async function getUserByUsername(username: string) {
  try {
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

// Server setup
const PORT = process.env.PORT || 3000;

const server = serve({
  port: parseInt(PORT as string),
  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;

    // Handle CORS preflight requests
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: setCorsHeaders(req),
      });
    }

    // Serve static files
    if (
      url.pathname.startsWith("/static/") ||
      url.pathname.startsWith("/styles/")
    ) {
      const filePath = path.join(process.cwd(), url.pathname.slice(1));
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file);
      }
      return new Response("File not found", { status: 404 });
    }

    // Handle built frontend files from dist directory
    if (url.pathname.startsWith("/src/")) {
      const distFilePath = path.join(
        process.cwd(),
        "dist",
        url.pathname.slice(1)
      );
      const file = Bun.file(distFilePath);

      if (await file.exists()) {
        // Determine content type based on file extension
        let contentType = "application/octet-stream";
        if (distFilePath.endsWith(".js")) {
          contentType = "application/javascript";
        } else if (distFilePath.endsWith(".css")) {
          contentType = "text/css";
        }

        return new Response(file, {
          headers: {
            "Content-Type": contentType,
          },
        });
      }
      return new Response("File not found", { status: 404 });
    }

    // Serve React app
    if (url.pathname === "/" || url.pathname === "/dashboard") {
      const htmlFile = Bun.file(
        path.join(process.cwd(), "public", "index.html")
      );
      if (await htmlFile.exists()) {
        return new Response(htmlFile, {
          headers: {
            "Content-Type": "text/html",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
      } else {
        return new Response("HTML file not found", { status: 404 });
      }
    }

    // API Routes
    if (url.pathname === "/api/user" && method === "GET") {
      const sessionId = url.searchParams.get("session");
      if (!sessionId || !sessions.has(sessionId)) {
        return new Response("Unauthorized", {
          status: 401,
          headers: setCorsHeaders(req),
        });
      }

      const session = sessions.get(sessionId)!;
      return new Response(JSON.stringify(session), {
        headers: {
          "Content-Type": "application/json",
          ...setCorsHeaders(req),
        },
      });
    }

    if (url.pathname === "/api/readings" && method === "GET") {
      const sessionId = url.searchParams.get("session");
      if (!sessionId || !sessions.has(sessionId)) {
        return new Response("Unauthorized", {
          status: 401,
          headers: setCorsHeaders(req),
        });
      }

      const session = sessions.get(sessionId)!;
      const readings = await getSugarReadings(session.userId);

      return new Response(JSON.stringify(readings), {
        headers: {
          "Content-Type": "application/json",
          ...setCorsHeaders(req),
        },
      });
    }

    if (url.pathname === "/api/login" && method === "POST") {
      try {
        const body = await req.json();
        const username = body.username;
        const password = body.password;

        const user = await getUserByUsername(username);
        if (user && (await bcrypt.compare(password, user.password))) {
          const sessionId = Math.random().toString(36).substring(2);
          sessions.set(sessionId, { userId: user.id, username: user.username });

          return new Response(
            JSON.stringify({
              sessionId,
              user: { userId: user.id, username: user.username },
            }),
            {
              headers: {
                "Content-Type": "application/json",
                ...setCorsHeaders(req),
              },
            }
          );
        }

        return new Response("Invalid credentials", {
          status: 401,
          headers: setCorsHeaders(req),
        });
      } catch (error) {
        return new Response("Invalid request body", {
          status: 400,
          headers: setCorsHeaders(req),
        });
      }
    }

    if (url.pathname === "/api/signup" && method === "POST") {
      try {
        const body = await req.json();
        const userData = {
          username: body.username,
          password: body.password,
          name: body.name,
          age: body.age,
          gender: body.gender,
        };

        const existingUser = await getUserByUsername(userData.username);
        if (existingUser) {
          return new Response("Username already exists", {
            status: 400,
            headers: setCorsHeaders(req),
          });
        }

        const newUser = await createUser(userData);
        if (newUser) {
          const sessionId = Math.random().toString(36).substring(2);
          sessions.set(sessionId, {
            userId: newUser.id,
            username: newUser.username,
          });

          return new Response(
            JSON.stringify({
              sessionId,
              user: { userId: newUser.id, username: newUser.username },
            }),
            {
              headers: {
                "Content-Type": "application/json",
                ...setCorsHeaders(req),
              },
            }
          );
        }

        return new Response("Failed to create account", {
          status: 500,
          headers: setCorsHeaders(req),
        });
      } catch (error) {
        return new Response("Invalid request body", {
          status: 400,
          headers: setCorsHeaders(req),
        });
      }
    }

    if (url.pathname === "/api/readings" && method === "POST") {
      try {
        const body = await req.json();
        const sessionId = body.session;

        if (!sessionId || !sessions.has(sessionId)) {
          return new Response("Unauthorized", {
            status: 401,
            headers: setCorsHeaders(req),
          });
        }

        const session = sessions.get(sessionId)!;
        const reading = {
          date: body.date,
          time: body.time,
          type: body.type,
          value: body.value,
        };

        const success = await addSugarReading(session.userId, reading);
        if (success) {
          return new Response(JSON.stringify({ success: true }), {
            headers: {
              "Content-Type": "application/json",
              ...setCorsHeaders(req),
            },
          });
        }

        return new Response("Failed to add reading", {
          status: 500,
          headers: setCorsHeaders(req),
        });
      } catch (error) {
        return new Response("Invalid request body", {
          status: 400,
          headers: setCorsHeaders(req),
        });
      }
    }

    if (url.pathname === "/api/logout" && method === "POST") {
      const sessionId = url.searchParams.get("session");
      if (sessionId && sessions.has(sessionId)) {
        sessions.delete(sessionId);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: {
          "Content-Type": "application/json",
          ...setCorsHeaders(req),
        },
      });
    }

    // Catch-all: serve React app for any other routes (SPA routing)
    const htmlFile = Bun.file(path.join(process.cwd(), "public", "index.html"));
    if (await htmlFile.exists()) {
      return new Response(htmlFile, {
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    return new Response("Not found", {
      status: 404,
      headers: setCorsHeaders(req),
    });
  },
});
