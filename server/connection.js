// server/server/db/connection.js
const mysql2 = require("mysql2");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "password",
  database: process.env.DB_NAME || "cache_me_if_you_can_db",
  connectTimeout: 60000, // 60 seconds timeout
};

let db = null;
let connectionPromise = null;
let isConnecting = false;

/**
 * Attempts to connect to MySQL with retry logic
 * Simple approach: try 10 times, wait 10 seconds between attempts
 * @returns {Promise} - Promise that resolves when connected or rejects after 10 attempts
 */
async function connectWithRetry() {
  // If already connected and authenticated, return it
  if (db && db.state === "authenticated") {
    return db;
  }

  // If already connecting, wait for that promise
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  isConnecting = true;
  connectionPromise = (async () => {
    const maxRetries = 10;
    const waitSeconds = 10;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;

      try {
        console.log(
          `Attempting to connect to MySQL (attempt ${attempt}/${maxRetries})...`
        );

        // Clean up previous connection if it exists
        if (db) {
          try {
            db.destroy();
          } catch (e) {
            // Ignore cleanup errors
          }
          db = null;
        }

        db = mysql2.createConnection(dbConfig);

        // Wrap connect in a promise
        await new Promise((resolve, reject) => {
          db.connect((err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });

        console.log("Connected to MySQL database!");
        isConnecting = false;

        // Handle connection errors and mark for reconnection
        db.on("error", (err) => {
          console.error("MySQL connection error:", err);
          if (
            err.code === "PROTOCOL_CONNECTION_LOST" ||
            err.code === "ECONNRESET"
          ) {
            console.log("Connection lost. Will reconnect on next query.");
            db = null;
            isConnecting = false;
            connectionPromise = null;
          }
        });

        return db;
      } catch (error) {
        console.error(`Connection attempt ${attempt} failed:`, error.message);

        // Clean up failed connection
        if (db) {
          try {
            db.destroy();
          } catch (e) {
            // Ignore cleanup errors
          }
          db = null;
        }

        // If this was the last attempt, throw error
        if (attempt >= maxRetries) {
          isConnecting = false;
          connectionPromise = null;
          throw new Error(
            `Failed to connect to MySQL after ${maxRetries} attempts: ${error.message}`
          );
        }

        // Wait 10 seconds before next attempt
        console.log(`Retrying in ${waitSeconds} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      }
    }
  })();

  return connectionPromise;
}

// Create wrapper object that mimics the mysql2 connection interface
const dbWrapper = {
  query: function (sql, params, callback) {
    // Handle different function signatures
    if (typeof params === "function") {
      callback = params;
      params = [];
    }
    if (!params) {
      params = [];
    }

    // If already connected, use directly (synchronous path)
    if (db && db.state === "authenticated") {
      return db.query(sql, params, callback);
    }

    // Otherwise, wait for connection (asynchronous path)
    connectWithRetry()
      .then((connection) => {
        connection.query(sql, params, callback);
      })
      .catch((err) => {
        if (callback) {
          callback(err, null);
        } else {
          console.error("Query failed due to connection error:", err);
        }
      });
  },

  execute: function (sql, params, callback) {
    // Handle different function signatures
    if (typeof params === "function") {
      callback = params;
      params = [];
    }
    if (!params) {
      params = [];
    }

    // If already connected, use directly (synchronous path)
    if (db && db.state === "authenticated") {
      return db.execute(sql, params, callback);
    }

    // Otherwise, wait for connection (asynchronous path)
    connectWithRetry()
      .then((connection) => {
        connection.execute(sql, params, callback);
      })
      .catch((err) => {
        if (callback) {
          callback(err, null);
        } else {
          console.error("Execute failed due to connection error:", err);
        }
      });
  },

  connect: function (callback) {
    connectWithRetry()
      .then((connection) => {
        if (callback) {
          callback(null);
        }
      })
      .catch((err) => {
        if (callback) {
          callback(err);
        }
      });
  },

  end: function (callback) {
    if (db) {
      return db.end(callback);
    }
    if (callback) {
      callback();
    }
  },

  destroy: function () {
    if (db) {
      return db.destroy();
    }
  },

  // Proxy other properties
  get state() {
    return db ? db.state : "disconnected";
  },

  on: function (event, handler) {
    connectWithRetry()
      .then((connection) => {
        connection.on(event, handler);
      })
      .catch((err) => {
        console.error("Failed to attach event handler:", err);
      });
  },
};

// Start connection process immediately
connectWithRetry().catch((err) => {
  console.error("Failed to establish initial database connection:", err);
});

// Export the wrapper for backward compatibility
module.exports = dbWrapper;

// Also export utility function to wait for connection
module.exports.waitForConnection = () => connectWithRetry();
module.exports.getConnection = () => connectWithRetry();
