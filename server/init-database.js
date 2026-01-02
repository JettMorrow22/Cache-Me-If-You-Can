// Database initialization script
// This will check if tables exist and create them if needed
const mysql2 = require("mysql2");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "password",
  database: process.env.DB_NAME || "cache_me_if_you_can_db",
  multipleStatements: true, // Allow multiple SQL statements
};

async function initDatabase() {
  try {
    console.log("Checking if tables exist...");

    // Connect to the database
    const adminConnection = mysql2.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      multipleStatements: true,
    });

    // Check if tables exist by querying for the runners table (our main table)
    const tablesExist = await new Promise((resolve, reject) => {
      adminConnection.query(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'runners'`,
        [dbConfig.database],
        (err, results) => {
          if (err) {
            // If error is because database doesn't exist, tables don't exist
            if (err.code === "ER_BAD_DB_ERROR") {
              resolve(false);
            } else {
              reject(err);
            }
          } else {
            resolve(results[0].count > 0);
          }
        }
      );
    });

    if (tablesExist) {
      console.log("Tables already exist. Skipping schema execution.");
      adminConnection.end();
      return;
    }

    console.log("Tables do not exist. Running schema.sql to initialize...");

    // Read schema file
    const schemaPath = path.join(__dirname, "schema.sql");
    let schema = fs.readFileSync(schemaPath, "utf8");

    // Remove DROP DATABASE and CREATE DATABASE statements since database already exists
    // Also remove USE statement as we're already connected to the database
    schema = schema
      .replace(/DROP DATABASE IF EXISTS.*?;/gi, "")
      .replace(/CREATE DATABASE.*?;/gi, "")
      .replace(/USE.*?;/gi, "");

    // Execute the schema
    await new Promise((resolve, reject) => {
      adminConnection.query(schema, (err, results) => {
        adminConnection.end();
        if (err) {
          reject(err);
        } else {
          console.log("Database initialized successfully!");
          resolve(results);
        }
      });
    });
  } catch (error) {
    console.error("Error initializing database:", error);
    throw new Error(`Database initialization failed: ${error.message}`);
  }
}

// Run initialization
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log("Database initialization check complete.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to initialize database:", error);
      process.exit(1);
    });
}

module.exports = { initDatabase };
