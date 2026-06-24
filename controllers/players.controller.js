const fs   = require('node:fs');
const path = require('node:path');
const Player = require('../models/players.model');

// Cartella base per le foto dei giocatori
//const PLAYERS_DIR = path.resolve(__dirname, '..', 'public', 'assets', 'img', 'players');
const PLAYERS_DIR = path.resolve(process.env.STORAGE_PATH, 'players');

/**
 * Sposta un file anche tra filesystem diversi.
 * fs.renameSync fallisce con EXDEV quando origine (cartella temp di multer)
 * e destinazione (volume montato STORAGE_PATH) sono su device diversi:
 * qui copiamo i dati e poi rimuoviamo il temporaneo.
 */
function moveFileSync(src, dest) {
  fs.copyFileSync(src, dest);
  fs.unlinkSync(src);
}

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
      moveFileSync(req.file.path, finalPath);
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
      team_id:     req.query.team_id
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
    const { first_name, last_name, role, shirt_number, team_id } = req.body;

    const data = {};
    if (first_name   !== undefined) data.first_name   = first_name;
    if (last_name    !== undefined) data.last_name    = last_name;
    if (role         !== undefined) data.role         = role;
    if (shirt_number !== undefined) data.shirt_number = Number(shirt_number || 0);
    if (team_id      !== undefined) data.team_id      = team_id === null || team_id === '' ? null : Number(team_id);

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
    moveFileSync(req.file.path, destination);

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