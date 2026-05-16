const db = require('../_db/mysql');

/* =========================
   CREATE MATCH
========================= */
async function createMatch(data) {
  const sql = `
    INSERT INTO matches
      (group_id, home_team_id, away_team_id, match_date, pitch_id, referee_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    data.group_id || null,
    data.home_team_id,
    data.away_team_id,
    data.match_date,
    data.pitch_id || null,
    data.referee_id || null,
    data.status || 'scheduled'
  ];

  const [result] = await db.execute(sql, params);
  return result.insertId;
}

/* =========================
   GET MATCHES (WITH TEAMS)
========================= */
async function getMatches(filters = {}) {
  let sql = `
    SELECT
      m.*,

      ht.name AS home_team_name,
      at.name AS away_team_name,

      tg.name AS group_name

    FROM matches m

    LEFT JOIN teams ht ON m.home_team_id = ht.id
    LEFT JOIN teams at ON m.away_team_id = at.id
    LEFT JOIN tournament_groups tg ON m.group_id = tg.id

    WHERE 1=1
  `;

  const params = [];

  if (filters.status) {
    sql += ' AND m.status = ?';
    params.push(filters.status);
  }

  if (filters.group_id) {
    sql += ' AND m.group_id = ?';
    params.push(filters.group_id);
  }

  sql += ` ORDER BY m.match_date ASC`; // 👈 cronologico (vecchio → futuro)

  const [rows] = await db.execute(sql, params);
  return rows;
}

/* =========================
   GET MATCH BY ID
========================= */
async function getMatchById(id) {
  const sql = `
    SELECT
      m.*,

      ht.name AS home_team_name,
      at.name AS away_team_name,

      tg.name AS group_name

    FROM matches m

    LEFT JOIN teams ht ON m.home_team_id = ht.id
    LEFT JOIN teams at ON m.away_team_id = at.id
    LEFT JOIN tournament_groups tg ON m.group_id = tg.id

    WHERE m.id = ?
  `;

  const [rows] = await db.execute(sql, [id]);
  return rows[0];
}

/* =========================
   UPDATE MATCH
========================= */
async function updateMatch(id, data) {
  const sql = `
    UPDATE matches
    SET
      group_id = ?,
      home_team_id = ?,
      away_team_id = ?,
      match_date = ?,
      pitch_id = ?,
      referee_id = ?,
      status = ?
    WHERE id = ?
  `;

  const params = [
    data.group_id,
    data.home_team_id,
    data.away_team_id,
    data.match_date,
    data.pitch_id,
    data.referee_id,
    data.status,
    id
  ];

  const [result] = await db.execute(sql, params);
  return result;
}

/* =========================
   DELETE MATCH
========================= */
async function deleteMatch(id) {
  const sql = `DELETE FROM matches WHERE id = ?`;
  const [result] = await db.execute(sql, [id]);
  return result;
}

/* =========================
   ADDITIONAL METHODS
========================= */
async function startMatch(id) {

  await db.execute(
    `
    UPDATE matches
    SET status = 'live',
        started_at = UTC_TIMESTAMP()
    WHERE id = ?
      AND status = 'scheduled'
    `,
    [id]
  );

  const [rows] = await db.execute(
    `
    SELECT 
      id,
      status,
      started_at,
      UTC_TIMESTAMP() AS mysql_utc_now,
      NOW() AS mysql_local_now
    FROM matches
    WHERE id = ?
    `,
    [id]
  );

  return true;
}

async function finishMatch(id) {
  await db.execute(
    `
    UPDATE matches
    SET status = 'finished',
        ended_at = UTC_TIMESTAMP()
    WHERE id = ?
      AND status = 'live'
    `,
    [id]
  );

  return true;
}

module.exports = {
  createMatch,
  getMatches,
  getMatchById,
  updateMatch,
  deleteMatch,
  startMatch,
  finishMatch
};