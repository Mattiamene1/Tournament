const fs = require('fs');
const path = require('path');
const Player = require('../models/players.model');

// Create Player
async function createPlayer(req, res) {
  try {
    const id = await Player.createPlayer(req.body);

    if (req.file) {
      const playersDir = path.join(
        __dirname,
        '..',
        'public',
        'assets',
        'img',
        'players'
      );

      if (!fs.existsSync(playersDir)) {
        fs.mkdirSync(playersDir, { recursive: true });
      }

      const finalPath = path.join(playersDir, `${id}.png`);
      fs.renameSync(req.file.path, finalPath);
    }

    res.status(201).json({
      success: true,
      player_id: id
    });

  } catch (err) {
    console.error(err);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        error: 'Numero di maglia già utilizzato in questa squadra'
      });
    }

    res.status(500).json({
      error: err.message
    });
  }
}

// Retrieve Players
async function getPlayers(req, res) {
  try {
    const filters = {
      first_name: req.query.first_name,
      last_name: req.query.last_name,
      role: req.query.role,
      team_id: req.query.team_id,
      rating: req.query.rating
    };

    const players = await Player.getPlayers(filters);
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: 'Errore recupero players' });
  }
}

// Retrieve Players by ID
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

    if (first_name !== undefined) data.first_name = first_name;
    if (last_name !== undefined) data.last_name = last_name;
    if (role !== undefined) data.role = role;
    if (rating !== undefined) data.rating = Number(rating || 0);
    if (shirt_number !== undefined) data.shirt_number = Number(shirt_number || 0);

    await Player.updatePlayer(id, data);

    res.json({
      success: true,
      message: 'Player aggiornato'
    });

  } catch (err) {
    console.error('Errore updatePlayer:', err);
    res.status(500).json({
      error: err.message
    });
  }
}

// Update Player Photo
async function uploadPlayerPhoto(req, res) {
  try {
    const player = await Player.getTeamById(req.params.id);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File mancante' });
    }

    const fileName = `${(req.id_player)}.png`;

    const destination = path.join(
      __dirname,
      '..',
      'public',
      'assets',
      'img',
      'players',
      fileName
    );

    fs.renameSync(req.file.path, destination);

    res.json({
      success: true,
      fileName
    });
  } catch (err) {
    console.error(err);
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