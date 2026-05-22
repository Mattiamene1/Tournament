const db = require('../_db/mysql');

async function createReferee(data) {
  const [result] = await db.execute(
    'INSERT INTO referees (first_name, last_name) VALUES (?, ?)',
    [data.first_name, data.last_name]
  );

  return result.insertId;
}

async function getReferees(filters = {}) {
  let sql = 'SELECT * FROM referees WHERE 1=1';
  const params = [];

  if (filters.first_name !== undefined) {
    sql += ' AND first_name = ?';
    params.push(filters.first_name);
  }

  if (filters.last_name !== undefined) {
    sql += ' AND last_name = ?';
    params.push(filters.last_name);
  }

  sql += ' ORDER BY first_name ASC';

  const [rows] = await db.execute(sql, params);
  return rows;
}

async function getRefereeById(id) {
  const [rows] = await db.execute(
    'SELECT * FROM referees WHERE id = ?',
    [id]
  );

  return rows[0];
}

async function updateReferee(id, data) {
  await db.execute(
    'UPDATE referees SET first_name = ?, last_name = ? WHERE id = ?',
    [data.first_name, data.last_name, id]
  );

  return true;
}

async function deleteReferee(id) {
  await db.execute(
    'DELETE FROM referees WHERE id = ?',
    [id]
  );

  return true;
}

module.exports = {
  createReferee,
  getReferees,
  getRefereeById,
  updateReferee,
  deleteReferee
};