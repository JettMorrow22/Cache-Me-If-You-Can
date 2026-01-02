// import the libraries
const express = require("express"); //allows us to call endpoints
const cors = require("cors"); // Frontend to backend communication
const cookieParser = require("cookie-parser"); // Parse cookies
const routes = require("./routes"); //import our defined routes
const { waitForConnection } = require("./connection"); //import database connection
const { initDatabase } = require("./init-database"); //import database initialization

const app = express(); //create backend service

// Configure CORS to allow credentials (cookies)
// CLIENT_URL should match the browser's origin (where the frontend is served from)
// This can be a public domain, internal IP, or localhost for development
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((url) => url.trim())
  : ["http://localhost:3000", "http://localhost:5050"];

app.use(
  cors({
    origin: function (origin, callback) {
      // Log for debugging
      console.log(
        `[CORS] Request origin: ${origin || "(no origin - proxied request)"}`
      );
      console.log(`[CORS] Allowed origins: ${allowedOrigins.join(", ")}`);

      // Allow requests with no origin (like mobile apps, curl, Postman, or proxied requests)
      if (!origin) {
        console.log("[CORS] Allowing request with no origin");
        return callback(null, true);
      }

      // Check if origin exactly matches or starts with an allowed origin
      const isAllowed = allowedOrigins.some((allowed) => {
        return origin === allowed || origin.startsWith(allowed);
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(
          `[CORS] BLOCKED origin: ${origin}. Allowed: ${allowedOrigins.join(
            ", "
          )}`
        );
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Allow cookies to be sent
  })
);

app.use(express.json()); // allows us to parse JSON bodies
app.use(cookieParser()); // Parse cookies from requests

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Cache Me If You Can API is running", status: "ok" });
});

app.use(routes); //router is now attached to the app

// Wait for database connection before starting the server
const PORT = 5050;
async function startServer() {
  try {
    console.log("Waiting for database connection...");
    await waitForConnection();
    console.log("Database connected. Initializing database if needed...");

    // Initialize database (will create tables if they don't exist)
    try {
      await initDatabase();
      console.log("Database initialization complete.");
    } catch (initError) {
      console.error("Database initialization warning:", initError.message);
      // Continue anyway - tables might already exist
    }

    console.log("Starting server...");
    // Opens port and starts listening to requests that come from frontend
    // Listen on 0.0.0.0 to accept connections from outside the container
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
