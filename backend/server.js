// backend/server.js
import express from "express";
import cors from "cors";
import db from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

// ✅ EVENTS API
app.get("/api/events", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        emoji,
        sport,
        DATE_FORMAT(date, '%Y-%m-%d') AS date,
        time,
        title,
        location,
        venue AS city,
        federation_link AS federation,
        source,
        league
      FROM events
      ORDER BY date,
        STR_TO_DATE(IF(time IS NULL OR time='' OR time='—','00:00', time), '%H:%i')
    `);

    res.json(rows);
  } catch (err) {
    console.error("API /api/events error:", err);
    res.status(500).json({ error: "Failed to load events" });
  }
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
