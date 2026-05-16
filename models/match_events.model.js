const db = require('../_db/mysql');

/* =========================
   CREATE MATCH EVENT
========================= */
async function createMatchEvent(data) {
  const sql = `
    INSERT INTO match_events (
      match_id,
      team_id,
      player_id,
      assist_player_id,
      event_type,
      goal_type,
      card_type,
      bonus_id,
      event_value,
      minute,
      extra_minute,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    data.match_id,
    data.team_id,
    data.player_id || null,
    data.assist_player_id || null,
    data.event_type,
    data.goal_type || null,
    data.card_type || null,
    data.bonus_id || null,
    data.event_value || 1,
    data.minute,
    data.extra_minute || null,
    data.notes || null
  ];

  const [result] = await db.execute(sql, params);
  return result.insertId;
}

/* =========================
   GET MATCH EVENTS
========================= */
async function getMatchEvents(filters = {}) {
  let sql = `
    SELECT
      me.*,

      p.first_name AS player_first_name,
      p.last_name AS player_last_name,

      ap.first_name AS assist_first_name,
      ap.last_name AS assist_last_name,

      t.name AS team_name,

      b.name AS bonus_name,
      b.goal_value AS bonus_value

    FROM match_events me

    LEFT JOIN players p ON me.player_id = p.id
    LEFT JOIN players ap ON me.assist_player_id = ap.id
    LEFT JOIN teams t ON me.team_id = t.id
    LEFT JOIN bonuses b ON me.bonus_id = b.id

    WHERE 1=1
  `;

  const params = [];

  if (filters.match_id) {
    sql += ` AND me.match_id = ?`;
    params.push(filters.match_id);
  }

  if (filters.team_id) {
    sql += ` AND me.team_id = ?`;
    params.push(filters.team_id);
  }

  if (filters.player_id) {
    sql += ` AND me.player_id = ?`;
    params.push(filters.player_id);
  }

  if (filters.event_type) {
    sql += ` AND me.event_type = ?`;
    params.push(filters.event_type);
  }

  sql += `
    ORDER BY 
      me.minute ASC,
      me.extra_minute ASC,
      me.id ASC
  `;

  const [rows] = await db.execute(sql, params);
  return rows;
}

/* =========================
   GET MATCH EVENT BY ID
========================= */
async function getMatchEventById(id) {
  const sql = `
    SELECT
      me.*,

      p.first_name AS player_first_name,
      p.last_name AS player_last_name,

      ap.first_name AS assist_first_name,
      ap.last_name AS assist_last_name,

      t.name AS team_name,

      b.name AS bonus_name,
      b.goal_value AS bonus_value

    FROM match_events me

    LEFT JOIN players p ON me.player_id = p.id
    LEFT JOIN players ap ON me.assist_player_id = ap.id
    LEFT JOIN teams t ON me.team_id = t.id
    LEFT JOIN bonuses b ON me.bonus_id = b.id

    WHERE me.id = ?
  `;

  const [rows] = await db.execute(sql, [id]);
  return rows[0];
}

/* =========================
   UPDATE MATCH EVENT
========================= */
async function updateMatchEvent(id, data) {
  const sql = `
    UPDATE match_events
    SET
      match_id = ?,
      team_id = ?,
      player_id = ?,
      assist_player_id = ?,
      event_type = ?,
      goal_type = ?,
      card_type = ?,
      event_value = ?,
      bonus_id = ?,
      minute = ?,
      extra_minute = ?,
      notes = ?
    WHERE id = ?
  `;

  const params = [
    data.match_id,
    data.team_id,
    data.player_id || null,
    data.assist_player_id || null,
    data.event_type,
    data.goal_type || null,
    data.card_type || null,
    data.event_value ?? 1,
    data.bonus_id || null,
    data.minute || null,
    data.extra_minute || null,
    data.notes || null,
    id
  ];

  const [result] = await db.execute(sql, params);
  return result;
}

/* =========================
   DELETE MATCH EVENT
========================= */
async function deleteMatchEvent(id) {
  const sql = `DELETE FROM match_events WHERE id = ?`;
  const [result] = await db.execute(sql, [id]);
  return result;
}

/* =========================
   ADDITIONAL METHODS
========================= */

async function updateMatchScoreAfterGoal(matchId, teamId) {
  const [rows] = await db.execute(
    `
    SELECT home_team_id, away_team_id
    FROM matches
    WHERE id = ?
    `,
    [matchId]
  );

  const match = rows[0];

  if (!match) {
    throw new Error('Match not found');
  }

  if (String(match.home_team_id) === String(teamId)) {
    await db.execute(
      `
      UPDATE matches
      SET home_score = COALESCE(home_score, 0) + 1
      WHERE id = ?
      `,
      [matchId]
    );
  } else if (String(match.away_team_id) === String(teamId)) {
    await db.execute(
      `
      UPDATE matches
      SET away_score = COALESCE(away_score, 0) + 1
      WHERE id = ?
      `,
      [matchId]
    );
  } else {
    throw new Error('Team does not belong to this match');
  }

  return true;
}

async function updateMatchScore(matchId, teamId, goalsToAdd = 1) {
  const [rows] = await db.execute(
    `
    SELECT home_team_id, away_team_id
    FROM matches
    WHERE id = ?
    `,
    [matchId]
  );

  const match = rows[0];

  if (!match) {
    throw new Error('Match not found');
  }

  if (String(match.home_team_id) === String(teamId)) {
    await db.execute(
      `
      UPDATE matches
      SET home_score = COALESCE(home_score, 0) + ?
      WHERE id = ?
      `,
      [goalsToAdd, matchId]
    );
  } else if (String(match.away_team_id) === String(teamId)) {
    await db.execute(
      `
      UPDATE matches
      SET away_score = COALESCE(away_score, 0) + ?
      WHERE id = ?
      `,
      [goalsToAdd, matchId]
    );
  } else {
    throw new Error('Team does not belong to this match');
  }

  return true;
}

module.exports = {
  createMatchEvent,
  getMatchEvents,
  getMatchEventById,
  updateMatchEvent,
  deleteMatchEvent,
  updateMatchScoreAfterGoal,
  updateMatchScore
};