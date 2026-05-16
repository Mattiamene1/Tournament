const db = require('../_db/mysql');

// Create Player
async function createPlayer(data) {
  const sql = `
    INSERT INTO players
      (first_name, last_name, role, rating, shirt_number, team_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const params = [
    data.first_name,
    data.last_name,
    data.role,
    data.rating,
    data.shirt_number,
    data.team_id
  ];

  const [result] = await db.execute(sql, params);
  return result.insertId;
}

// Retrieve Players
async function getPlayers(filters) {
  let sql = `
    SELECT *
    FROM players
    WHERE 1=1
  `;

  const params = [];

  if (filters.team_id) {
    sql += ' AND team_id = ?';
    params.push(filters.team_id);
  }

  if (filters.role) {
    sql += ' AND role = ?';
    params.push(filters.role);
  }

  if (filters.rating) {
    sql += ' AND rating = ?';
    params.push(filters.rating);
  }

  sql += ' ORDER BY shirt_number ASC';

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

  if (data.rating !== undefined) {
    fields.push('rating = ?');
    params.push(Number(data.rating || 0));
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