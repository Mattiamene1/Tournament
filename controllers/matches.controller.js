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
    res.json({
      success: true,
      extra_time: result.extra_time,
      shootout: result.shootout,
      match: updatedMatch
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function resolveExtraTime(req, res) {
  try {
    const result = await Match.resolveExtraTime(req.params.id);
    const updatedMatch = await Match.getMatchById(req.params.id);
    res.json({
      success: true,
      finished: result.finished,
      shootout: result.shootout,
      match: updatedMatch
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
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

async function pauseTimer(req, res) {
  try {
    await Match.pauseTimer(req.params.id);
    const updatedMatch = await Match.getMatchById(req.params.id);
    res.json({ success: true, match: updatedMatch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function resumeTimer(req, res) {
  try {
    await Match.resumeTimer(req.params.id);
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

/* Aggiunge un tiro dello shootout (giocatore + esito) */
async function addShootoutKick(req, res) {
  try {
    const { team_id, player_id, scored } = req.body;
    if (team_id === undefined || team_id === null) {
      return res.status(400).json({ error: 'team_id mancante' });
    }
    await Match.addShootoutKick(
      req.params.id,
      Number(team_id),
      player_id ? Number(player_id) : null,
      scored === true || scored === 'true' || scored === 1 || scored === '1'
    );
    const summary = await Match.getShootoutSummary(req.params.id);
    const updatedMatch = await Match.getMatchById(req.params.id);
    res.json({ success: true, match: updatedMatch, summary });
  } catch (err) {
    // errori di stato/validazione → 400
    res.status(400).json({ error: err.message });
  }
}

/* Rimuove un tiro dello shootout */
async function removeShootoutKick(req, res) {
  try {
    await Match.removeShootoutKick(req.params.id, req.params.eventId);
    const summary = await Match.getShootoutSummary(req.params.id);
    const updatedMatch = await Match.getMatchById(req.params.id);
    res.json({ success: true, match: updatedMatch, summary });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function finishShootout(req, res) {
  try {
    await Match.finishShootout(req.params.id);
    const updatedMatch = await Match.getMatchById(req.params.id);
    res.json({ success: true, match: updatedMatch });
  } catch (err) {
    // pareggio / tentativi diversi → 400 con messaggio
    res.status(400).json({ error: err.message });
  }
}

/* ============================================================
   FASE FINALE — TABELLONE
============================================================ */

/* Estrae i parametri opzionali (data/campo/arbitro) dal body */
function finalsOpts(body = {}) {
  return {
    match_date: body.match_date || null,
    pitch_id:   body.pitch_id || null,
    referee_id: body.referee_id || null
  };
}

/* POST /matches/finals/quarters  → "chiudi gironi e genera quarti" */
async function generateQuarterfinals(req, res) {
  try {
    const result = await Match.generateQuarterfinals(finalsOpts(req.body));
    if (result.reason === 'already_exists') {
      return res.status(409).json({ success: false, error: 'I quarti sono già stati generati.' });
    }
    res.status(201).json({ success: true, created: result.created });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
}

/* POST /matches/finals/semifinals */
async function generateSemifinals(req, res) {
  try {
    const result = await Match.generateSemifinals(finalsOpts(req.body));
    if (result.reason === 'already_exists') {
      return res.status(409).json({ success: false, error: 'Le semifinali sono già state generate.' });
    }
    res.status(201).json({ success: true, created: result.created });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
}

/* POST /matches/finals/finals  → finale + finalina 3°/4° */
async function generateFinals(req, res) {
  try {
    const result = await Match.generateFinals(finalsOpts(req.body));
    if (result.reason === 'already_exists') {
      return res.status(409).json({ success: false, error: 'Finale e finalina sono già state generate.' });
    }
    res.status(201).json({ success: true, created: result.created });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
}

/* DELETE /matches/finals  → svuota tutto il tabellone */
async function resetKnockout(req, res) {
  try {
    const deleted = await Match.deleteKnockoutMatches();
    res.json({ success: true, deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/* GET /matches/meta/pitches  → elenco campi da gioco */
async function getPitches(req, res) {
  try {
    const pitches = await Match.getPitches();
    res.json(pitches);
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
  resolveExtraTime,
  endFirstHalf,
  startSecondHalf,
  pauseTimer,
  resumeTimer,
  updateShootoutScore,
  finishShootout,
  addShootoutKick,
  removeShootoutKick,

  // Fase finale
  generateQuarterfinals,
  generateSemifinals,
  generateFinals,
  resetKnockout,

  // Campi
  getPitches
};