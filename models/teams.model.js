const db = require('../_db/mysql');

async function createTeam(data) {
  const { name } = data;

  if (!name) {
    throw new Error('Team name mancante');
  }

  const [result] = await db.query(
    'INSERT INTO teams (name) VALUES (?)',
    [name]
  );

  return result.insertId;
}

async function getTeams(filters = {}) {
  let sql = 'SELECT * FROM teams WHERE 1=1';
  const params = [];

  if (filters.id) {
    sql += ' AND id = ?';
    params.push(filters.id);
  }

  if (filters.name) {
    sql += ' AND name LIKE ?';
    params.push(`%${filters.name}%`);
  }

  sql += ' ORDER BY name ASC';

  const [rows] = await db.query(sql, params);
  return rows;
}

async function getTeamById(id) {
  const [rows] = await db.query(
    'SELECT * FROM teams WHERE id = ?',
    [id]
  );

  return rows[0];
}

async function updateTeam(id, data) {
  const { name } = data;

  if (!name) {
    throw new Error('Team name mancante');
  }

  await db.query(
    'UPDATE teams SET name = ? WHERE id = ?',
    [name, id]
  );

  return true;
}

async function deleteTeam(id) {
  await db.query(
    'DELETE FROM teams WHERE id = ?',
    [id]
  );

  return true;
}

async function getTeamsWithPlayers() {
  const [rows] = await db.query(`
    SELECT 
      t.id AS team_id,
      t.name AS team_name,
      p.id AS player_id,
      p.first_name,
      p.last_name,
      p.role,
      p.shirt_number,
      p.rating
    FROM teams t
    LEFT JOIN players p ON p.team_id = t.id
    ORDER BY t.name ASC, p.role ASC, p.shirt_number ASC
  `);

  const teamsMap = {};

  rows.forEach(row => {
    if (!teamsMap[row.team_id]) {
      teamsMap[row.team_id] = {
        id: row.team_id,
        name: row.team_name,
        players: []
      };
    }

    if (row.player_id) {
      teamsMap[row.team_id].players.push({
        id: row.player_id,
        first_name: row.first_name,
        last_name: row.last_name,
        role: row.role,
        shirt_number: row.shirt_number,
        rating: row.rating
      });
    }
  });

  return Object.values(teamsMap);
}

module.exports = {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  getTeamsWithPlayers
};