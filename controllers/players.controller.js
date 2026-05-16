const Player = require('../models/players.model');

// Create Player
async function createPlayer(req, res) {
  try {
    const id = await Player.createPlayer(req.body);
    res.status(201).json({ success: true, player_id: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// Retrieve Players
async function getPlayers(req, res) {
  try {
    const filters = {
      team_id: req.query.team_id,
      role: req.query.role,
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
  deletePlayer
};