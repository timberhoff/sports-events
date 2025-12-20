// backend/db.js
import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "8320", // later: process.env.DB_PASS
  database: "sports_events",
  waitForConnections: true,
  connectionLimit: 10,
});

export default db;
