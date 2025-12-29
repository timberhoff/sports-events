// backend/server.js
import express from "express";
import cors from "cors";
import db from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/events", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        e.id,
        e.emoji,
        e.sport,
        e.date,
        e.time,
        e.league,

        COALESCE(e.home_team_name, ht.name) AS home_team,
        COALESCE(e.away_team_name, at.name) AS away_team,

        -- ✅ always provide a title (manual events will use e.title)
        CASE
          WHEN COALESCE(e.home_team_name, ht.name) IS NOT NULL
           AND COALESCE(e.away_team_name, at.name) IS NOT NULL
          THEN CONCAT(COALESCE(e.home_team_name, ht.name), ' vs ', COALESCE(e.away_team_name, at.name))
          ELSE e.title
        END AS title,

        COALESCE(v.name, e.venue) AS venue,
        COALESCE(c.name, e.city)  AS city,

        e.federation_link AS federation,
        e.federation_name AS federationName
      FROM events e
      LEFT JOIN teams ht ON ht.id = e.home_team_id
      LEFT JOIN teams at ON at.id = e.away_team_id
      LEFT JOIN venues v ON v.id = e.venue_id
      LEFT JOIN cities c ON c.id = v.city_id
      ORDER BY e.date, e.time;
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load events" });
  }
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
