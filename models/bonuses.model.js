const db = require('../_db/mysql');

async function createBonus(data) {
  const [result] = await db.execute(
    'INSERT INTO bonuses (name, active) VALUES (?, ?)',
    [data.name, data.active ?? 1]
  );

  return result.insertId;
}

async function getBonuses(filters = {}) {
  let sql = 'SELECT * FROM bonuses WHERE 1=1';
  const params = [];

  if (filters.active !== undefined) {
    sql += ' AND active = ?';
    params.push(filters.active);
  }

  sql += ' ORDER BY name ASC';

  const [rows] = await db.execute(sql, params);
  return rows;
}

async function getBonusById(id) {
  const [rows] = await db.execute(
    'SELECT * FROM bonuses WHERE id = ?',
    [id]
  );

  return rows[0];
}

async function updateBonus(id, data) {
  await db.execute(
    'UPDATE bonuses SET name = ?, active = ? WHERE id = ?',
    [data.name, data.active ?? 1, id]
  );

  return true;
}

async function deleteBonus(id) {
  await db.execute(
    'DELETE FROM bonuses WHERE id = ?',
    [id]
  );

  return true;
}

module.exports = {
  createBonus,
  getBonuses,
  getBonusById,
  updateBonus,
  deleteBonus
};