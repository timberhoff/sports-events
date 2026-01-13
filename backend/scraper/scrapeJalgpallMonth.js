import db from "../db.js";


import { scrapeJalgpallCalendarDay } from "./jalgpallCalendar.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Convert "DD.MM.YYYY" -> "YYYY-MM-DD"
function toIsoDate(dateStr) {
  const [dd, mm, yyyy] = dateStr.split(".").map(s => s.trim());
  return `${yyyy}-${mm}-${dd}`;
}

// Build "DD.MM.YYYY"
function toEeDate(d) {
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function startOfDay(dateObj) {
  const d = new Date(dateObj);
  d.setHours(0, 0, 0, 0);
  return d;
}

function nextDay(dateObj) {
  const d = new Date(dateObj);
  d.setDate(d.getDate() + 1);
  return d;
}

async function upsertRawFootballEvent(row) {
  // row from scraper:
  // { external_id, league, date:"25.01.2026", time:"15:00", venue, venue_url, match_url, ticket_url, home_team, away_team, ... }

  const isoDate = toIsoDate(row.date);

  const sql = `
    INSERT INTO raw_football_events (
      source,
      league,
      external_id,
      date,
      time,
      raw_venue,
      raw_city,
      home_team_name,
      home_team_code,
      away_team_name,
      away_team_code,
      federation_link,
      federation_name,
      ticket_link,
      match_link,
      raw_payload
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      league = VALUES(league),
      date = VALUES(date),
      time = VALUES(time),
      raw_venue = VALUES(raw_venue),
      raw_city = VALUES(raw_city),
      home_team_name = VALUES(home_team_name),
      away_team_name = VALUES(away_team_name),
      federation_link = VALUES(federation_link),
      ticket_link = VALUES(ticket_link),
      match_link = VALUES(match_link),
      raw_payload = VALUES(raw_payload),
      scraped_at = CURRENT_TIMESTAMP
  `;

  const params = [
    "jalgpallee",
    row.league ?? null,
    row.external_id,
    isoDate,
    row.time ?? null,
    row.venue ?? null,
    null, // raw_city (you can later parse city from venue or mapping table)
    row.home_team ?? null,
    null, // home_team_code (optional later)
    row.away_team ?? null,
    null, // away_team_code (optional later)
    row.league_url ?? row.match_url ?? null, // federation_link-ish (or keep as null)
    "Eesti Jalgpalli Liit",
    row.ticket_url ?? null,
    row.match_url ?? null,
    JSON.stringify(row),
  ];

  await db.query(sql, params);
}

async function scrapeRange(fromEe, toEe) {
  const fromParts = fromEe.split(".").map(Number);
  const toParts = toEe.split(".").map(Number);

  const from = startOfDay(new Date(fromParts[2], fromParts[1] - 1, fromParts[0]));
  const to = startOfDay(new Date(toParts[2], toParts[1] - 1, toParts[0]));

  let totalInserted = 0;
  let dayCount = 0;

  for (let d = from; d <= to; d = nextDay(d)) {
    const dateStr = toEeDate(d);
    dayCount += 1;

    try {
      const events = await scrapeJalgpallCalendarDay(dateStr);

      for (const ev of events) {
        // IMPORTANT: ensure ev.external_id exists (from the upgraded scraper)
        if (!ev.external_id) {
          console.warn("Missing external_id, skipping:", ev);
          continue;
        }
        await upsertRawFootballEvent(ev);
        totalInserted += 1;
      }

      console.log(`[${dateStr}] scraped ${events.length} events (upserted ${events.length})`);
    } catch (err) {
      console.error(`[${dateStr}] FAILED`, err?.message || err);
    }

    // polite delay between days
    await sleep(700);
  }

  console.log(`DONE. Days: ${dayCount}, upserts attempted: ${totalInserted}`);
}

// Usage:
// node scraper/scrapeJalgpallMonth.js 01.01.2026 31.01.2026
const fromEe = process.argv[2] || "01.01.2026";
const toEe = process.argv[3] || "31.01.2026";

await scrapeRange(fromEe, toEe);
process.exit(0);
