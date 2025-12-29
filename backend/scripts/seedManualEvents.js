// backend/scripts/seedManualEvents.js
import mysql from "mysql2/promise";
import events from "../seed/events.manual.js";

if (!Array.isArray(events)) {
  throw new Error("Seed data error: events is not an array. Check events.manual.js export.");
}


function cleanDash(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === "—" || s === "-" || s === "" ? null : s;
}

function normalizeFederation(e) {
  // case 1: fencing style: federation: { name, link }
  if (e.federation && typeof e.federation === "object") {
    return {
      federation_name: cleanDash(e.federation.name),
      federation_url: cleanDash(e.federation.link),
    };
  }

  // case 2: your other style: federation: "url", federationName: "name"
  return {
    federation_name: cleanDash(e.federationName),
    federation_url: cleanDash(e.federation),
  };
}

function parseTimeToMysql(timeStr) {
  const t = cleanDash(timeStr);
  if (!t) return null;

  // Accept "10:00" -> "10:00:00"
  // If later you have "18:30", same.
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;

  // If something unexpected, store null to avoid MySQL errors
  return null;
}

async function main() {
  const db = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "8320",
    database: "sports_events",
  });

  const sql = `
  INSERT INTO events_manual
    (
      emoji, sport, date, time, title,
      location, venue, city, league,
      home_team, away_team,
      tickets, federation_name, federation_url
    )
  VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  AS new
  ON DUPLICATE KEY UPDATE
    emoji = new.emoji,
    location = new.location,
    venue = new.venue,
    city = new.city,
    league = new.league,
    home_team = new.home_team,
    away_team = new.away_team,
    tickets = new.tickets,
    federation_name = new.federation_name,
    federation_url = new.federation_url
`;



  let insertedOrUpdated = 0;
if (!Array.isArray(events)) {
  throw new Error("Seed data error: events is not an array. Check events.manual.js export.");
}



  for (const e of events) {
    const fed = normalizeFederation(e);

    const title =
  cleanDash(e.title) ??
  cleanDash(e.event) ??
  (cleanDash(e.homeTeam) && cleanDash(e.awayTeam)
    ? `${cleanDash(e.homeTeam)} vs ${cleanDash(e.awayTeam)}`
    : "Untitled");

const row = [
  cleanDash(e.emoji),
  cleanDash(e.sport) ?? "Unknown",
  e.date,
  parseTimeToMysql(e.time),

  cleanDash(e.event) ?? "Untitled",

  cleanDash(e.location),          // you can keep using this
  cleanDash(e.venue),             // NEW (optional)
  cleanDash(e.city),
  cleanDash(e.league),            // NEW (optional)

  cleanDash(e.homeTeam),          // NEW (optional)
  cleanDash(e.awayTeam),          // NEW (optional)

  cleanDash(e.tickets),
  fed.federation_name,
  fed.federation_url,
];


    await db.execute(sql, row);
    insertedOrUpdated++;
  }

  await db.end();
  console.log(`Done. Processed ${insertedOrUpdated} events into events_manual.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
