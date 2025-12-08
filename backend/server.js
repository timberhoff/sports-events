import express from "express";
import cors from "cors";
import db from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// TEST ROUTE
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend working!" });
});

// GET EVENTS
app.get("/api/events", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM events ORDER BY date ASC");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Database error" });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
