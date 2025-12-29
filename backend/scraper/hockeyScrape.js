// backend/scraper/hockeyScrape.js
import db from "../db.js";

const SOURCE = "ehs_hockey_scraper";
const FEDERATION_NAME = "Eesti Hoki";
const FEDERATION_LINK = "https://ehs.eestihoki.ee/";
const API_KEY = "5c08247f238f1c4da69c6c359cf052d7";

const DIVISIONS = [
  { id: 18975, league: "UNIBET HOKILIIGA" },     // Unibet Liiga
  { id: 18979, league: "NAISTE LIIGA" },         // Naiste Liiga
  // add more when you find them:
  // { id: 19342, league: "U14" },
  // { id: 19346, league: "U16" },
];

function toMysqlDate(ddmmyyyy) {
  const [dd, mm, yyyy] = (ddmmyyyy || "").split(".");
  if (!dd || !mm || !yyyy) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function buildUrl(divisionId) {
  return (
    "https://api.hockeydata.net/data/ebel/Schedule" +
    `?apiKey=${API_KEY}` +
    `&lang=en` +
    `&referer=ehs.eestihoki.ee` +
    `&divisionId=${divisionId}`
  );
}

async function fetchDivision(divisionId) {
  const url = buildUrl(divisionId);
  const res = await fetch(url, {
    headers: {
      accept: "application/json,text/plain,*/*",
      referer: "https://ehs.eestihoki.ee/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

async function upsertGame(g, leagueName) {
  const externalId = g?.id;
  const dateText = g?.scheduledDate?.value;
  const timeText = g?.scheduledTime || null;

  // response shape uses these (you already saw them)
  const home = g?.homeTeamLongName;
  const away = g?.awayTeamLongName;
  const venue = g?.location?.longname || null;

  if (!externalId || !dateText || !home || !away) return { ok: false };

  const mysqlDate = toMysqlDate(dateText);
  if (!mysqlDate) return { ok: false };

  await db.query(
    `
    INSERT INTO raw_hockey_events
      (
        external_id,
        source,
        league,
        home_team_name,
        away_team_name,
        raw_venue,
        raw_city,
        date,
        time,
        federation_link,
        federation_name,
        ticket_price,
        raw_payload
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      scraped_at = CURRENT_TIMESTAMP,
      raw_venue = VALUES(raw_venue),
      raw_payload = VALUES(raw_payload),
      time = VALUES(time),
      league = VALUES(league)
    `,
    [
      externalId,
      SOURCE,
      leagueName,
      home,
      away,
      venue,
      null,
      mysqlDate,
      timeText,
      FEDERATION_LINK,
      FEDERATION_NAME,
      null,
      JSON.stringify(g),
    ]
  );

  return { ok: true, mysqlDate, timeText, home, away, venue };
}

async function scrapeHockey() {
  let total = 0;

  for (const div of DIVISIONS) {
    console.log(`\n=== ${div.league} (divisionId=${div.id}) ===`);
    const json = await fetchDivision(div.id);
    const rows = json?.data?.rows ?? [];
    console.log("FOUND ROWS:", rows.length);

    let inserted = 0;

    for (const g of rows) {
      const r = await upsertGame(g, div.league);
      if (!r.ok) continue;

      inserted++;
      total++;
      console.log(
        "✔",
        r.mysqlDate,
        r.timeText ?? "--:--",
        r.home,
        "vs",
        r.away,
        "@",
        r.venue ?? "(no venue)"
      );
    }

    console.log(`DONE ${div.league}. Inserted/updated: ${inserted}`);
  }

  console.log(`\nALL DONE. Total inserted/updated: ${total}`);

  if (typeof db.end === "function") await db.end();
}

scrapeHockey().catch(async (err) => {
  console.error(err);
  try {
    if (typeof db.end === "function") await db.end();
  } catch {}
  process.exitCode = 1;
});
