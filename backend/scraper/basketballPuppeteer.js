import puppeteer from "puppeteer";
import db from "../db.js";
import { getTeamIdByCode } from "../teamService.js";

async function scrapeBasketball() {

  const league = "Optibet Eesti–Läti Korvpalliliiga";

  console.log("Launching browser...");

  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled"
    ]
  });

  const page = await browser.newPage();

await db.query("DELETE FROM events WHERE sport = 'Basketball' AND source = 'scraper'");



  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
  );

  await page.goto("https://www.estlatbl.com/et/mangud", {
    waitUntil: "networkidle2",
    timeout: 60000
  });

  await page.waitForSelector("table.standings.scheduleAndResults tbody tr");

  const rows = await page.$$eval(
    "table.standings.scheduleAndResults tbody tr",
    trs => trs.map(tr => tr.innerText.split("\n"))
  );

  console.log("FOUND ROWS:", rows.length);

  for (const row of rows) {
    if (row.length < 6) continue;

    const dateText = row[0];
    const location = row[1].trim();
    const rawHome = row[3].trim();
    const rawAway = row[5].trim();

    const match = dateText.match(/(\d{2})\.(\d{2})\.(\d{4}),\s*(\d{2}:\d{2})/);
    if (!match) continue;

    const [_, day, month, year, time] = match;
    const mysqlDate = `${year}-${month}-${day}`;

    // Get IDs from DB
    const homeTeamId = await getTeamIdByCode(rawHome);
    const awayTeamId = await getTeamIdByCode(rawAway);

    // Skip events where team code is not found
    if (!homeTeamId || !awayTeamId) {
      console.log("Unknown team code:", rawHome, rawAway);
      continue;
    }

    const title = `${rawHome} vs ${rawAway}`;

    try {
  await db.query(`
  INSERT INTO events (sport, title, date, time, home_team_id, away_team_id, location, league, source)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scraper')`,
  [
    "Basketball",
    title,
    mysqlDate,
    time,
    homeTeamId,
    awayTeamId,
    location,
    league
  ]
);

  console.log("Inserted:", title, mysqlDate, time, "@", location);

} catch (err) {
  if (err.code === "ER_DUP_ENTRY") {
    console.log("Duplicate event skipped:", title, mysqlDate, time);
    continue;
  } else {
    throw err; // only crash on real errors
  }
}
  }

  await browser.close();
  console.log("DONE.");
}

scrapeBasketball();

/** -------------------------------------------------------------------------
 * BASKETBALL SCRAPER — FULL EXPLANATION (FOR STUDY & REFERENCE)
 *
 * This file uses Puppeteer to scrape basketball events from the 
 * EstLatBL website and save them into the MySQL database.
 *
 * -------------------------------------------------------------------------
 * 1. IMPORTS
 * -------------------------------------------------------------------------
 * puppeteer      → Controls a real Chromium browser with JavaScript.
 * db             → MySQL database connection (from db.js).
 * getTeamIdByCode(code)
 *                → Looks up a team's numeric ID in the teams table.
 *
 * -------------------------------------------------------------------------
 * 2. MAIN FUNCTION (scrapeBasketball)
 * -------------------------------------------------------------------------
 * This function:
 *  - Launches the browser
 *  - Opens the game webpage
 *  - Extracts game rows
 *  - Converts data into clean format
 *  - Fetches team IDs from DB
 *  - Inserts each event into the events table
 *  - Skips duplicates (using UNIQUE constraint)
 *  - Closes the browser
 *
 * -------------------------------------------------------------------------
 * 3. LAUNCH BROWSER
 * -------------------------------------------------------------------------
 * headless: false → you SEE the browser window (good for debugging)
 * slowMo: 50      → slows actions down 50ms so you can watch it
 *
 * args: no-sandbox, disable-setuid-sandbox, disable-blink-features
 *     → makes puppeteer more stable and less detectable
 *
 * -------------------------------------------------------------------------
 * 4. OPEN NEW TAB AND SET USER AGENT
 * -------------------------------------------------------------------------
 * newPage()      → like opening a new browser tab
 * setUserAgent() → makes the scraper look like a real user
 *
 * -------------------------------------------------------------------------
 * 5. GO TO TARGET URL
 * -------------------------------------------------------------------------
 * page.goto(url, options)
 * 
 * waitUntil: "networkidle2"
 *     → waits until network is quiet (page fully loaded)
 * timeout: 60000
 *     → 60 second timeout
 *
 * -------------------------------------------------------------------------
 * 6. WAIT FOR TABLE CONTENTS
 * -------------------------------------------------------------------------
 * Waits until the game rows <tr> appear on screen.
 * Prevents scraping too early before the data loads.
 *
 * -------------------------------------------------------------------------
 * 7. EXTRACT ALL ROWS
 * -------------------------------------------------------------------------
 * $$eval(selector, callback)
 *     → Runs callback inside the browser
 *     → Returns an array for each <tr>
 *
 * Each row becomes something like:
 * [
 *   "T 09.12.2025, 20:00",
 *   "Tallinn, TalTech Spordihoone",
 *   "",
 *   "TCH",
 *   "-",
 *   "OGR"
 * ]
 *
 * -------------------------------------------------------------------------
 * 8. LOOP THROUGH ROWS
 * -------------------------------------------------------------------------
 * If row length < 6 → skip invalid rows
 *
 * Extract:
 *   dateText → first column ("T 09.12.2025, 20:00")
 *   location → second column ("Tallinn...Spordihoone")
 *   rawHome  → home team code ("TCH")
 *   rawAway  → away team code ("OGR")
 *
 * -------------------------------------------------------------------------
 * 9. PARSE DATE AND TIME
 * -------------------------------------------------------------------------
 * Regex extracts:
 *   day   (09)
 *   month (12)
 *   year  (2025)
 *   time  (20:00)
 *
 * Convert to MySQL format:
 *   YYYY-MM-DD
 *
 * Example:
 *   "2025-12-09"
 *
 * -------------------------------------------------------------------------
 * 10. TEAM ID LOOKUP
 * -------------------------------------------------------------------------
 * getTeamIdByCode(rawHome)
 *     → finds numeric ID for "TCH", "OGR", etc.
 *
 * If a team code does not exist → skip event
 *
 * -------------------------------------------------------------------------
 * 11. INSERT EVENT INTO DATABASE (try/catch)
 * -------------------------------------------------------------------------
 * INSERT INTO events (sport, title, date, time, home_team_id, away_team_id, location)
 *
 * If unique_event constraint catches duplicate:
 *     → skip it instead of crashing
 *
 * This makes the scraper safe to run ANY number of times.
 *
 * -------------------------------------------------------------------------
 * 12. CLOSE BROWSER
 * -------------------------------------------------------------------------
 * After scraping all games, browser closes.
 * Clean, safe exit.
 *
 * -------------------------------------------------------------------------
 * 13. RUN THE SCRAPER
 * -------------------------------------------------------------------------
 * scrapeBasketball();
 *
 * The function is executed when the file is run with:
 *     node backend/scraper/basketballPuppeteer.js
 *
 * -------------------------------------------------------------------------
 * END OF DOCUMENTATION
 * ------------------------------------------------------------------------- */
