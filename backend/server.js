// backend/server.js
import express from "express";
import cors from "cors";
import db from "./db.js";
import crypto from "crypto"; // near top of server.js

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/sports", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, slug, emoji
      FROM sports
      ORDER BY name;
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load sports" });
  }
});

function buildTree(flatRows) {
  const byId = new Map();
  const roots = [];

  for (const r of flatRows) {
    byId.set(r.id, { ...r, children: [] });
  }

  for (const r of flatRows) {
    const node = byId.get(r.id);
    if (r.parent_id == null) {
      roots.push(node);
    } else {
      const parent = byId.get(r.parent_id);
      if (parent) parent.children.push(node);
      else roots.push(node); // safety fallback
    }
  }

  // optional: sort children by sort_order then name
  const sortRec = (nodes) => {
    nodes.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
    nodes.forEach(n => sortRec(n.children));
  };
  sortRec(roots);

  return roots;
}



app.get("/api/league-tree", async (req, res) => {
  try {
    const sportId = Number(req.query.sport_id);
    if (!sportId) return res.status(400).json({ error: "sport_id is required" });

    const [rows] = await db.query(
      `
      SELECT id, sport_id, parent_id, name, node_type, is_default, sort_order
      FROM league_nodes
      WHERE sport_id = ?
      ORDER BY sort_order, name
      `,
      [sportId]
    );

    res.json(buildTree(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load league tree" });
  }
});


app.get("/api/admin/manual-events", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        e.id,
        e.external_id,
        e.title,
        e.subtitle,
        e.date,
        e.date_end,
        e.time,
        e.sport_id,
        e.sport,
        e.emoji,
        e.venue_id,
        COALESCE(v.name, e.venue) AS venue,
        COALESCE(c.name, e.city) AS city,
        e.federation_link,
        e.federation_name
      FROM events e
      LEFT JOIN venues v ON v.id = e.venue_id
      LEFT JOIN cities c ON c.id = v.city_id
      WHERE e.source = 'manual'
      ORDER BY e.date DESC, e.time DESC;
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load manual events" });
  }
});
app.post("/api/admin/manual-events", async (req, res) => {
  try {
    const {
      sport_id,
      title,
      subtitle,
      date,
      date_end,
      time,
      venue_id,
      federation_link,
      federation_name,
    } = req.body;

    if (!sport_id) return res.status(400).json({ error: "sport_id is required" });
    if (!title?.trim()) return res.status(400).json({ error: "title is required" });
    if (!date) return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });

    // fetch sport info (name + emoji)
    const [[sportRow]] = await db.query(
      `SELECT id, name, emoji FROM sports WHERE id = ?`,
      [sport_id]
    );
    if (!sportRow) return res.status(400).json({ error: "Invalid sport_id" });

    // fetch venue -> city (optional)
    let city = null;
    let venueName = null;
    if (venue_id) {
      const [[vrow]] = await db.query(
        `
        SELECT v.name AS venue_name, c.name AS city_name
        FROM venues v
        LEFT JOIN cities c ON c.id = v.city_id
        WHERE v.id = ?
        `,
        [venue_id]
      );
      venueName = vrow?.venue_name ?? null;
      city = vrow?.city_name ?? null;
    }

    const external_id = `manual_${crypto.randomUUID()}`;

    const [result] = await db.query(
      `
      INSERT INTO events
      (
        source, external_id,
        sport_id, sport, emoji,
        title, subtitle,
        date, date_end, time,
        venue_id, venue, city,
        federation_link, federation_name
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        "manual",
        external_id,
        sportRow.id,
        sportRow.name,
        sportRow.emoji ?? null,
        title.trim(),
        subtitle?.trim() || null,
        date,
        date_end || null,
        time?.trim() || null,
        venue_id || null,
        venueName, // optional backup text
        city,
        federation_link?.trim() || null,
        federation_name?.trim() || null,
      ]
    );

    res.json({ id: result.insertId, external_id });
  } catch (err) {
    console.error(err);
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Duplicate event (source+external_id)" });
    }
    res.status(500).json({ error: "Failed to create manual event" });
  }
});
app.delete("/api/admin/manual-events/:id", async (req, res) => {
  try {
    await db.query(`DELETE FROM events WHERE id = ? AND source = 'manual'`, [
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete manual event" });
  }
});


app.get("/api/admin/sports", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, slug, emoji
      FROM sports
      ORDER BY name;
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load sports" });
  }
});
app.post("/api/admin/sports", async (req, res) => {
  try {
    const { name, slug, emoji } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });
    if (!slug?.trim()) return res.status(400).json({ error: "slug is required" });

    const [r] = await db.query(
      `INSERT INTO sports (name, slug, emoji) VALUES (?, ?, ?)`,
      [name.trim(), slug.trim(), emoji?.trim() || null]
    );

    res.json({ id: r.insertId, name: name.trim(), slug: slug.trim(), emoji: emoji?.trim() || null });
  } catch (err) {
    console.error(err);
    if (err?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Sport name/slug already exists" });
    res.status(500).json({ error: "Failed to create sport" });
  }
});
app.put("/api/admin/sports/:id", async (req, res) => {
  try {
    const { name, slug, emoji } = req.body;
    await db.query(
      `UPDATE sports SET name = ?, slug = ?, emoji = ? WHERE id = ?`,
      [name?.trim() || null, slug?.trim() || null, emoji?.trim() || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update sport" });
  }
});
app.delete("/api/admin/sports/:id", async (req, res) => {
  try {
    await db.query(`DELETE FROM sports WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete sport" });
  }
});
app.get("/api/admin/categories", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, sort_order
      FROM categories
      ORDER BY sort_order, name;
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load categories" });
  }
});
app.get("/api/admin/sports/:id/categories", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT category_id FROM sport_categories WHERE sport_id = ?`,
      [req.params.id]
    );
    res.json(rows.map(r => r.category_id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load sport categories" });
  }
});
app.put("/api/admin/sports/:id/categories", async (req, res) => {
  try {
    const sportId = Number(req.params.id);
    const categoryIds = Array.isArray(req.body.categoryIds) ? req.body.categoryIds : [];

    // replace-all strategy
    await db.query(`DELETE FROM sport_categories WHERE sport_id = ?`, [sportId]);

    for (const cid of categoryIds) {
      await db.query(`INSERT INTO sport_categories (sport_id, category_id) VALUES (?, ?)`, [sportId, cid]);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save sport categories" });
  }
});


app.get("/api/admin/venues", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        v.id,
        v.name,
        v.city_id,
        c.name AS city_name,
        v.address,
        v.lat,
        v.lng,
        v.website_url
      FROM venues v
      LEFT JOIN cities c ON c.id = v.city_id
      ORDER BY c.name, v.name;
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load venues" });
  }
});

app.put("/api/admin/venues/:id", async (req, res) => {
  try {
    const { name, city_id, address, lat, lng, website_url } = req.body;

    await db.query(
      `
      UPDATE venues
      SET name = ?, city_id = ?, address = ?, lat = ?, lng = ?, website_url = ?
      WHERE id = ?
      `,
      [
        name?.trim() ?? null,
        city_id ?? null,
        address?.trim() ?? null,
        lat ?? null,
        lng ?? null,
        website_url?.trim() ?? null,
        req.params.id,
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update venue" });
  }
});
app.delete("/api/admin/venues/:id", async (req, res) => {
  try {
    await db.query(`DELETE FROM venues WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete venue" });
  }
});
app.get("/api/admin/venues/:id/aliases", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, alias, venue_id FROM venue_aliases WHERE venue_id = ? ORDER BY alias`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load aliases" });
  }
});
app.post("/api/admin/venues/:id/aliases", async (req, res) => {
  try {
    const venueId = Number(req.params.id);
    const { alias } = req.body;

    if (!alias || !alias.trim()) {
      return res.status(400).json({ error: "alias is required" });
    }

    await db.query(
      `INSERT INTO venue_aliases (alias, venue_id) VALUES (?, ?)`,
      [alias.trim(), venueId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    // duplicate alias
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Alias already exists" });
    }
    res.status(500).json({ error: "Failed to add alias" });
  }
});
app.delete("/api/admin/aliases/:aliasId", async (req, res) => {
  try {
    await db.query(`DELETE FROM venue_aliases WHERE id = ?`, [req.params.aliasId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete alias" });
  }
});
app.get("/api/admin/cities", async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, name FROM cities ORDER BY name`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load cities" });
  }
});
app.post("/api/admin/venues", async (req, res) => {
  try {
    const { name, city_id, address, lat, lng, website_url } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const [result] = await db.query(
      `
      INSERT INTO venues (name, city_id, address, lat, lng, website_url)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        city_id || null,
        address || null,
        lat || null,
        lng || null,
        website_url || null,
      ]
    );

    res.json({
      id: result.insertId,
      name,
      city_id,
      address,
      lat,
      lng,
      website_url,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create venue" });
  }
});


app.get("/api/events", async (req, res) => {
  try {
   // backend/server.js  (replace the big SELECT with this version)
const [rows] = await db.query(`
  SELECT
    e.id,
    e.emoji,
    e.sport,
    e.sport_id,
    e.date,
    e.date_end,
    e.time,
    e.league,
    lna.node_id AS league_node_id,
    e.subtitle,
    e.venue_id,

    COALESCE(e.home_team_name, ht.name) AS home_team,
    COALESCE(e.away_team_name, at.name) AS away_team,

    CASE
      WHEN COALESCE(e.home_team_name, ht.name) IS NOT NULL
       AND COALESCE(e.away_team_name, at.name) IS NOT NULL
      THEN CONCAT(COALESCE(e.home_team_name, ht.name), ' vs ', COALESCE(e.away_team_name, at.name))
      ELSE e.title
    END AS title,

    COALESCE(v.name, e.venue) AS venue,
COALESCE(c.name, e.city)  AS city,

v.lat AS venue_lat,
v.lng AS venue_lng,
c.lat AS city_lat,
c.lng AS city_lng,


    e.federation_link AS federation,
    e.federation_name AS federationName,

    scats.categories AS categories

  FROM events e
  LEFT JOIN teams ht ON ht.id = e.home_team_id
  LEFT JOIN teams at ON at.id = e.away_team_id
  LEFT JOIN venues v ON v.id = e.venue_id
  LEFT JOIN cities c ON c.id = v.city_id

 

  LEFT JOIN league_node_aliases lna
    ON lna.sport_id = e.sport_id
   AND LOWER(lna.alias) = LOWER(TRIM(e.league))

  LEFT JOIN (
    SELECT
      s.name AS sport_name,
      GROUP_CONCAT(cat.name ORDER BY cat.sort_order SEPARATOR ', ') AS categories
    FROM sports s
    JOIN sport_categories x ON x.sport_id = s.id
    JOIN categories cat ON cat.id = x.category_id
    GROUP BY s.name
  ) scats ON scats.sport_name = e.sport

  ORDER BY e.date, e.time;
`);




    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load events" });
  }
});


app.get("/api/venues/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT v.id, v.name, v.lat, v.lng, v.website_url, c.name AS city
      FROM venues v
      LEFT JOIN cities c ON c.id = v.city_id
      WHERE v.id = ?
      `,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: "Venue not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load venue" });
  }
});

app.get("/api/debug/unmapped-leagues", async (req, res) => {
  try {
    const sportId = Number(req.query.sport_id) || null;

    const [rows] = await db.query(
      `
      SELECT
        e.sport_id,
        e.sport,
        TRIM(e.league) AS league_text,
        COUNT(*) AS event_count
      FROM events e
      LEFT JOIN league_node_aliases lna
        ON lna.sport_id = e.sport_id
       AND LOWER(lna.alias) = LOWER(TRIM(e.league))
      WHERE e.league IS NOT NULL
        AND TRIM(e.league) <> ''
        AND lna.node_id IS NULL
        ${sportId ? "AND e.sport_id = ?" : ""}
      GROUP BY e.sport_id, e.sport, league_text
      ORDER BY event_count DESC, league_text ASC;
      `,
      sportId ? [sportId] : []
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list unmapped leagues" });
  }
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
