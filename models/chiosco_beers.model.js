const db = require('../_db/mysql');

/* =========================
   CREATE BEER EVENT
========================= */
async function createBeerEvent(data) {
  const sql = `
    INSERT INTO chiosco_beers
      (team_id, quantity)
    VALUES (?, ?)
  `;

  const params = [
    data.team_id,
    data.quantity || 1
  ];

  const [result] = await db.execute(sql, params);
  return result.insertId;
}

/* =========================
   GET CHIOSCO STANDINGS
========================= */
async function getChioscoStandings() {
  const sql = `
    SELECT
      t.id,
      t.name,
      COALESCE(SUM(cb.quantity), 0) AS beers
    FROM teams t
    LEFT JOIN chiosco_beers cb ON cb.team_id = t.id
    GROUP BY t.id, t.name
    ORDER BY beers DESC, t.name ASC
  `;

  const [rows] = await db.execute(sql);
  return rows;
}

/* =========================
   GET BEER EVENTS
========================= */
async function getBeerEvents(filters = {}) {
  let sql = `
    SELECT
      cb.*,
      t.name AS team_name
    FROM chiosco_beers cb
    JOIN teams t ON t.id = cb.team_id
    WHERE 1=1
  `;

  const params = [];

  if (filters.team_id) {
    sql += ` AND cb.team_id = ?`;
    params.push(filters.team_id);
  }

  sql += ` ORDER BY t.name DESC`;

  const [rows] = await db.execute(sql, params);
  return rows;
}

/* =========================
   DELETE BEER EVENT
========================= */
async function deleteBeerEvent(id) {
  const sql = `
    DELETE FROM chiosco_beers
    WHERE id = ?
  `;

  const [result] = await db.execute(sql, [id]);
  return result;
}

module.exports = {
  createBeerEvent,
  getChioscoStandings,
  getBeerEvents,
  deleteBeerEvent
};