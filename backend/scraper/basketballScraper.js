import axios from "axios";
import { load } from "cheerio";
import db from "../db.js";

const URL = "https://www.estlatbl.com/et/ajakava";

async function scrapeBasketball() {
  try {
    console.log("Scraping basketball games from HTML...");

    const { data } = await axios.get(URL, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = load(data);

    const rows = $("tr.flex");
    console.log("Found rows:", rows.length);

    rows.each(async (_, el) => {
      const row = $(el);

      // --- DATE + TIME ---
      const dt = row.find("td.dateAndTimeTd").text().trim();
      const match = dt.match(/(\d{2})\.(\d{2})\.(\d{4}),\s*(\d{2}:\d{2})/);

      if (!match) return;

      const [full, day, month, year, time] = match;
      const mysqlDate = `${year}-${month}-${day}`;

      // --- TEAMS ---
      const homeTeam = row.find("td.homeTeam").text().trim();
      const awayTeam = row.find("td.awayTeam").text().trim();

      // --- TITLE ---
      const title = `${homeTeam} vs ${awayTeam}`;

      // --- LOCATION ---
      // Location is inside date cell below the date line
      let location = row.find("td.dateAndTimeTd span").last().text().trim();
      if (!location) location = "Unknown";

      // --- INSERT INTO MYSQL ---
      await db.query(
        `INSERT INTO events
        (sport, title, home_team, away_team, date, time, location)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          "Basketball",
          title,
          homeTeam,
          awayTeam,
          mysqlDate,
          time,
          location
        ]
      );

      console.log("Inserted:", title);
    });

    console.log("DONE.");

  } catch (err) {
    console.error("Scraper error:", err);
  }
}

scrapeBasketball();
