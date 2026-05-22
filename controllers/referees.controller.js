const fs = require('fs');
const path = require('path');

const Referee = require('../models/referees.model');

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
    const referees = await Referee.getReferees({
      active: req.query.active
    });

    res.json(referees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getRefereeById(req, res) {
  try {
    const referee = await Referee.getRefereeById(req.params.id);

    if (!referee) {
      return res.status(404).json({ error: 'Referee not found' });
    }

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
    if (!req.file)  return res.status(400).json({ error: 'File mancante' });

    const dir = path.join(__dirname, '..', 'public', 'assets', 'img', 'referees');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.renameSync(req.file.path, path.join(dir, `${req.params.id}.png`));
    res.json({ success: true });
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