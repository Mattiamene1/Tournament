const fs   = require('node:fs');
const path = require('node:path');
const Player = require('../models/players.model');
 
// Cartella base per le foto dei giocatori
//const PLAYERS_DIR = path.resolve(__dirname, '..', 'public', 'assets', 'img', 'players');
const PLAYERS_DIR = path.resolve(process.env.STORAGE_PATH, 'players');
/**
 * Valida che l'ID sia un intero positivo e che il path finale
 * sia dentro la cartella attesa (prevenzione path traversal).
 */
function safePlayerPath(id) {
  const numericId = Number.parseInt(id, 10);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('ID non valido');
  }
 
  const dest = path.resolve(PLAYERS_DIR, `${numericId}.png`);
 
  // Assicura che il file finale sia dentro PLAYERS_DIR
  if (!dest.startsWith(PLAYERS_DIR + path.sep)) {
    throw new Error('Path non consentito');
  }
 
  return dest;
}
 
// Create Player
async function createPlayer(req, res) {
  try {
    const id = await Player.createPlayer(req.body);
 
    if (req.file) {
      if (!fs.existsSync(PLAYERS_DIR)) {
        fs.mkdirSync(PLAYERS_DIR, { recursive: true });
      }
 
      const finalPath = safePlayerPath(id);
      fs.renameSync(req.file.path, finalPath);
    }
 
    res.status(201).json({ success: true, player_id: id });
 
  } catch (err) {
    console.error(err);
 
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
 
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Numero di maglia già utilizzato in questa squadra' });
    }
 
    res.status(500).json({ error: err.message });
  }
}
 
// Retrieve Players
async function getPlayers(req, res) {
  try {
    const filters = {
      first_name:  req.query.first_name,
      last_name:   req.query.last_name,
      role:        req.query.role,
      team_id:     req.query.team_id,
      rating:      req.query.rating
    };
 
    const players = await Player.getPlayers(filters);
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: 'Errore recupero players' });
  }
}
 
// Retrieve Player by ID
async function getPlayerById(req, res) {
  try {
    const player = await Player.getPlayerById(req.params.id);
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
 
// Update Player
async function updatePlayer(req, res) {
  try {
    const { id } = req.params;
    const { first_name, last_name, role, rating, shirt_number } = req.body;
 
    const data = {};
    if (first_name   !== undefined) data.first_name   = first_name;
    if (last_name    !== undefined) data.last_name    = last_name;
    if (role         !== undefined) data.role         = role;
    if (rating       !== undefined) data.rating       = Number(rating || 0);
    if (shirt_number !== undefined) data.shirt_number = Number(shirt_number || 0);
 
    await Player.updatePlayer(id, data);
    res.json({ success: true, message: 'Player aggiornato' });
 
  } catch (err) {
    console.error('Errore updatePlayer:', err);
    res.status(500).json({ error: err.message });
  }
}
 
// Upload Player Photo
async function uploadPlayerPhoto(req, res) {
  try {
    const player = await Player.getPlayerById(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    if (!req.file) return res.status(400).json({ error: 'File mancante' });
 
    if (!fs.existsSync(PLAYERS_DIR)) {
      fs.mkdirSync(PLAYERS_DIR, { recursive: true });
    }
 
    const destination = safePlayerPath(req.params.id);
    fs.renameSync(req.file.path, destination);
 
    res.json({ success: true, fileName: path.basename(destination) });
 
  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
}
 
// Delete Player
async function deletePlayer(req, res) {
  try {
    await Player.deletePlayer(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
 
module.exports = {
  createPlayer,
  getPlayers,
  getPlayerById,
  updatePlayer,
  uploadPlayerPhoto,
  deletePlayer
};