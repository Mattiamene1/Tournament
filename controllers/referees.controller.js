const fs   = require('node:fs');
const path = require('node:path');
const Referee = require('../models/referees.model');
 
// Cartella base per le foto degli arbitri
//const REFEREES_DIR = path.resolve(__dirname, '..', 'public', 'assets', 'img', 'referees');
const REFEREES_DIR = path.resolve(process.env.STORAGE_PATH, 'referees');

/**
 * Valida che l'ID sia un intero positivo e che il path finale
 * sia dentro la cartella attesa (prevenzione path traversal).
 */
function safeRefereePath(id) {
  const numericId = Number.parseInt(id, 10);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('ID non valido');
  }
 
  const dest = path.resolve(REFEREES_DIR, `${numericId}.png`);
 
  if (!dest.startsWith(REFEREES_DIR + path.sep)) {
    throw new Error('Path non consentito');
  }
 
  return dest;
}
 
async function createReferee(req, res) {
  try {
    const id = await Referee.createReferee(req.body);
    res.status(201).json({ success: true, referee_id: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
 
async function getReferees(req, res) {
  try {
    const referees = await Referee.getReferees({ active: req.query.active });
    res.json(referees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
 
async function getRefereeById(req, res) {
  try {
    const referee = await Referee.getRefereeById(req.params.id);
    if (!referee) return res.status(404).json({ error: 'Referee not found' });
    res.json(referee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
 
async function updateReferee(req, res) {
  try {
    await Referee.updateReferee(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
 
async function uploadRefereePhoto(req, res) {
  try {
    const referee = await Referee.getRefereeById(req.params.id);
    if (!referee) return res.status(404).json({ error: 'Referee not found' });
    if (!req.file) return res.status(400).json({ error: 'File mancante' });
 
    if (!fs.existsSync(REFEREES_DIR)) {
      fs.mkdirSync(REFEREES_DIR, { recursive: true });
    }
 
    const destination = safeRefereePath(req.params.id);
    fs.renameSync(req.file.path, destination);
 
    res.json({ success: true, fileName: path.basename(destination) });
 
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
}
 
async function deleteReferee(req, res) {
  try {
    await Referee.deleteReferee(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
 
module.exports = {
  createReferee,
  getReferees,
  getRefereeById,
  updateReferee,
  uploadRefereePhoto,
  deleteReferee
};
 