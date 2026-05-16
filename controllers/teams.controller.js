const fs = require('fs');
const path = require('path');
const Team = require('../models/teams.model');

function normalizeTeamName(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
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
      id: req.query.id
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

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(team);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function updateTeam(req, res) {
  try {
    await Team.updateTeam(req.params.id, req.body);

    res.json({
      success: true,
      message: 'Team aggiornato'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function deleteTeam(req, res) {
  try {
    await Team.deleteTeam(req.params.id);

    res.json({
      success: true,
      message: 'Team eliminato'
    });
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

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File mancante' });
    }

    const fileName = `${normalizeTeamName(team.name)}_logo.png`;

    const destination = path.join(
      __dirname,
      '..',
      'public',
      'assets',
      'img',
      'teams',
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

async function uploadTeamPhoto(req, res) {
  try {
    const team = await Team.getTeamById(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File mancante' });
    }

    const fileName = `${team.id}.png`;

    const destination = path.join(
      __dirname,
      '..',
      'public',
      'assets',
      'img',
      'teams',
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