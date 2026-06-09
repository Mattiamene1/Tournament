const fs   = require('node:fs');
const path = require('node:path');
const Team = require('../models/teams.model');

// Cartella base per le immagini delle squadre
//const TEAMS_DIR = path.resolve(__dirname, '..', 'public', 'assets', 'img', 'teams');
const TEAMS_DIR = path.resolve(process.env.STORAGE_PATH, 'teams');

function normalizeTeamName(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

/**
 * Valida che il fileName non contenga path separators o sequenze pericolose
 * e che il path finale resti dentro TEAMS_DIR.
 */
function safeTeamPath(fileName) {
  // Il nome file non deve contenere separatori di path o punti multipli
  const safeFileName = path.basename(fileName); // strips any directory component
  if (safeFileName !== fileName) {
    throw new Error('Nome file non valido');
  }

  const dest = path.resolve(TEAMS_DIR, safeFileName);

  if (!dest.startsWith(TEAMS_DIR + path.sep)) {
    throw new Error('Path non consentito');
  }

  return dest;
}

async function createTeam(req, res) {
  try {
    const id = await Team.createTeam(req.body);
    res.status(201).json({ success: true, team_id: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function getTeams(req, res) {
  try {
    const filters = {
      name: req.query.name,
      id:   req.query.id
    };
    const teams = await Team.getTeams(filters);
    res.json(teams);
  } catch (err) {
    console.error('Errore getTeams:', err);
    res.status(500).json({ error: 'Errore nel recupero delle teams' });
  }
}

async function getTeamById(req, res) {
  try {
    const team = await Team.getTeamById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function updateTeam(req, res) {
  try {
    await Team.updateTeam(req.params.id, req.body);
    res.json({ success: true, message: 'Team aggiornato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function deleteTeam(req, res) {
  try {
    await Team.deleteTeam(req.params.id);
    res.json({ success: true, message: 'Team eliminato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function getTeamsWithPlayers(req, res) {
  try {
    const data = await Team.getTeamsWithPlayers();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function uploadTeamLogo(req, res) {
  try {
    const team = await Team.getTeamById(req.params.id);
    if (!team)     return res.status(404).json({ error: 'Team not found' });
    if (!req.file) return res.status(400).json({ error: 'File mancante' });

    if (!fs.existsSync(TEAMS_DIR)) fs.mkdirSync(TEAMS_DIR, { recursive: true });

    // FIX: validate via path.basename — normalizeTeamName produces safe names,
    // but safeTeamPath double-checks no traversal is possible
    const fileName    = `${normalizeTeamName(team.name)}_logo.png`;
    const destination = safeTeamPath(fileName);

    fs.renameSync(req.file.path, destination);
    res.json({ success: true, fileName });

  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
}

async function uploadTeamPhoto(req, res) {
  try {
    const team = await Team.getTeamById(req.params.id);
    if (!team)     return res.status(404).json({ error: 'Team not found' });
    if (!req.file) return res.status(400).json({ error: 'File mancante' });

    if (!fs.existsSync(TEAMS_DIR)) fs.mkdirSync(TEAMS_DIR, { recursive: true });

    // FIX: validate numeric id before using it in a path
    const numericId = Number.parseInt(team.id, 10);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return res.status(400).json({ error: 'ID team non valido' });
    }

    const fileName    = `${numericId}.png`;
    const destination = safeTeamPath(fileName);

    fs.renameSync(req.file.path, destination);
    res.json({ success: true, fileName });

  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  getTeamsWithPlayers,
  uploadTeamLogo,
  uploadTeamPhoto
};