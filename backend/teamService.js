import db from "./db.js";

export async function getTeamIdByCode(code) {
  const [rows] = await db.query("SELECT id FROM teams WHERE code = ?", [code]);
  if (rows.length === 0) return null;
  return rows[0].id;
}
