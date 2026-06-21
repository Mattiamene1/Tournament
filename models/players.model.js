const db = require('../_db/mysql');

// Create Player
async function createPlayer(data) {
  const sql = `
    INSERT INTO players
      (first_name, last_name, role, shirt_number, team_id)
    VALUES (?, ?, ?, ?, ?)
  `;

  const params = [
    data.first_name,
    data.last_name,
    data.role,
    data.shirt_number,
    data.team_id || null
  ];

  const [result] = await db.execute(sql, params);
  return result.insertId;
}

// Retrieve Players
async function getPlayers(filters = {}) {
  let sql = `
    SELECT
      p.*,
      t.name AS team_name
    FROM players p
    LEFT JOIN teams t ON p.team_id = t.id
    WHERE 1=1
  `;

  const params = [];

  if (filters.first_name) {
    sql += ' AND p.first_name LIKE ?';
    params.push(`%${filters.first_name}%`);
  }

  if (filters.last_name) {
    sql += ' AND p.last_name LIKE ?';
    params.push(`%${filters.last_name}%`);
  }

  if (filters.role) {
    sql += ' AND p.role = ?';
    params.push(filters.role);
  }

  if (filters.team_id) {
    sql += ' AND p.team_id = ?';
    params.push(filters.team_id);
  }

  sql += `
    ORDER BY
      t.name ASC,
      p.shirt_number ASC,
      p.last_name ASC,
      p.first_name ASC
  `;

  const [rows] = await db.execute(sql, params);
  return rows;
}

// Retrieve Player by ID
async function getPlayerById(id) {
  const sql = `
    SELECT *
    FROM players
    WHERE id = ?
  `;

  const [rows] = await db.execute(sql, [id]);
  return rows[0];
}

// Update Player
async function updatePlayer(id, data) {
  const fields = [];
  const params = [];

  if (data.first_name !== undefined) {
    fields.push('first_name = ?');
    params.push(data.first_name);
  }

  if (data.last_name !== undefined) {
    fields.push('last_name = ?');
    params.push(data.last_name);
  }

  if (data.role !== undefined) {
    fields.push('role = ?');
    params.push(data.role);
  }

  if (data.shirt_number !== undefined) {
    fields.push('shirt_number = ?');
    params.push(Number(data.shirt_number || 0));
  }

  if (!fields.length) {
    throw new Error('Nessun campo da aggiornare');
  }

  params.push(id);

  const sql = `
    UPDATE players
    SET ${fields.join(', ')}
    WHERE id = ?
  `;

  await db.execute(sql, params);

  return true;
}

// Delete Player
async function deletePlayer(id) {
  const sql = `DELETE FROM players WHERE id=?`;
  const [result] = await db.execute(sql, [id]);
  return result;
}

module.exports = {
  createPlayer,
  getPlayers,
  getPlayerById,
  updatePlayer,
  deletePlayer
};