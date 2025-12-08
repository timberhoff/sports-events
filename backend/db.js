import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "8320",
  database: "sports_events",
  waitForConnections: true,
});

export default db;
