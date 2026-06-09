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
        phase = 'first_half',
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

/* Fine 1° tempo → intervallo */
async function endFirstHalf(id) {
  await db.execute(
    `
    UPDATE matches
    SET phase = 'halftime',
        first_half_ended_at = UTC_TIMESTAMP()
    WHERE id = ?
      AND status = 'live'
      AND phase = 'first_half'
    `,
    [id]
  );
  return true;
}

/* Inizio 2° tempo */
async function startSecondHalf(id) {
  await db.execute(
    `
    UPDATE matches
    SET phase = 'second_half',
        second_half_started_at = UTC_TIMESTAMP()
    WHERE id = ?
      AND status = 'live'
      AND phase = 'halftime'
    `,
    [id]
  );
  return true;
}

/*
  Fine partita.
  Se il punteggio dei tempi regolamentari è in parità,
  la partita NON si chiude: passa alla fase 'shootout' (calci di rigore).
  Altrimenti viene chiusa normalmente.
  Ritorna { shootout: true } se è andata ai rigori.
*/
async function finishMatch(id) {
  const [rows] = await db.execute(
    `SELECT status, phase, home_score, away_score FROM matches WHERE id = ?`,
    [id]
  );
  const match = rows[0];
  if (!match || match.status !== 'live') return { shootout: false };

  const isDraw = Number(match.home_score || 0) === Number(match.away_score || 0);

  if (isDraw) {
    await db.execute(
      `
      UPDATE matches
      SET phase = 'shootout'
      WHERE id = ?
        AND status = 'live'
      `,
      [id]
    );
    return { shootout: true };
  }

  await db.execute(
    `
    UPDATE matches
    SET status = 'finished',
        phase = 'ended',
        ended_at = UTC_TIMESTAMP()
    WHERE id = ?
      AND status = 'live'
    `,
    [id]
  );
  return { shootout: false };
}

/* Aggiorna il punteggio dei rigori (side: 'home' | 'away', delta: +1 / -1) */
async function updateShootoutScore(id, side, delta) {
  const column = side === 'away' ? 'away_shootout_score' : 'home_shootout_score';

  await db.execute(
    `
    UPDATE matches
    SET ${column} = GREATEST(0, ${column} + ?)
    WHERE id = ?
      AND status = 'live'
      AND phase = 'shootout'
    `,
    [Number(delta) || 0, id]
  );
  return true;
}

/* Chiusura definitiva dopo i rigori */
async function finishShootout(id) {
  await db.execute(
    `
    UPDATE matches
    SET status = 'finished',
        phase = 'ended',
        ended_at = UTC_TIMESTAMP()
    WHERE id = ?
      AND status = 'live'
      AND phase = 'shootout'
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
  finishMatch,
  endFirstHalf,
  startSecondHalf,
  updateShootoutScore,
  finishShootout
};