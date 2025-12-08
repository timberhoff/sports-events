import puppeteer from "puppeteer";
import db from "../db.js";
import { getTeamIdByCode } from "../teamService.js";

async function scrapeBasketball() {
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

await db.query("DELETE FROM events WHERE sport = 'Basketball'");


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
  await db.query(
    `INSERT INTO events 
        (sport, title, date, time, home_team_id, away_team_id, location)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      "Basketball",
      title,
      mysqlDate,
      time,
      homeTeamId,
      awayTeamId,
      location
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
