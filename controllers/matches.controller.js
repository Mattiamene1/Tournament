const Match = require('../models/matches.model');

/* CREATE */
async function createMatch(req, res) {
  try {
    const id = await Match.createMatch(req.body);
    res.status(201).json({ success: true, match_id: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/* GET ALL */
async function getMatches(req, res) {
  try {
    const filters = {};

    if (req.query.status) filters.status = req.query.status;
    if (req.query.group_id) filters.group_id = req.query.group_id;

    const matches = await Match.getMatches(filters);
    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel recupero partite' });
  }
}

/* GET BY ID */
async function getMatchById(req, res) {
  try {
    const match = await Match.getMatchById(req.params.id);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json(match);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/* UPDATE */
async function updateMatch(req, res) {
  try {
    await Match.updateMatch(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/* DELETE */
async function deleteMatch(req, res) {
  try {
    await Match.deleteMatch(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/* Additional methods*/
async function startMatch(req, res) {
  try {
    await Match.startMatch(req.params.id);
    const updatedMatch = await Match.getMatchById(req.params.id);
    res.json({ success: true, match: updatedMatch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function finishMatch(req, res) {
  try {
    const result = await Match.finishMatch(req.params.id);
    const updatedMatch = await Match.getMatchById(req.params.id);
    res.json({ success: true, shootout: result.shootout, match: updatedMatch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function endFirstHalf(req, res) {
  try {
    await Match.endFirstHalf(req.params.id);
    const updatedMatch = await Match.getMatchById(req.params.id);
    res.json({ success: true, match: updatedMatch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function startSecondHalf(req, res) {
  try {
    await Match.startSecondHalf(req.params.id);
    const updatedMatch = await Match.getMatchById(req.params.id);
    res.json({ success: true, match: updatedMatch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function updateShootoutScore(req, res) {
  try {
    const { side, delta } = req.body;
    if (side !== 'home' && side !== 'away') {
      return res.status(400).json({ error: 'side non valido (home|away)' });
    }
    await Match.updateShootoutScore(req.params.id, side, delta);
    const updatedMatch = await Match.getMatchById(req.params.id);
    res.json({ success: true, match: updatedMatch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function finishShootout(req, res) {
  try {
    await Match.finishShootout(req.params.id);
    const updatedMatch = await Match.getMatchById(req.params.id);
    res.json({ success: true, match: updatedMatch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
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