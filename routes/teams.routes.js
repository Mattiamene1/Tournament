const express = require('express');
const multer = require('multer');

const router = express.Router();
const controller = require('../controllers/teams.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }  // 8 MB
});

// Create Team
router.post('/', isAuthenticated, controller.createTeam);

// IMPORTANT: static routes first
router.get('/players', controller.getTeamsWithPlayers);

// Retrieve Teams
router.get('/', controller.getTeams);

// Retrieve Team by ID
router.get('/:id', controller.getTeamById);

// Update Team
router.put('/:id', isAuthenticated, controller.updateTeam);

// Upload logo
router.post(
  '/:id/logo',
  isAuthenticated,
  upload.single('logo'),
  controller.uploadTeamLogo
);

// Upload team photo
router.post(
  '/:id/photo',
  isAuthenticated,
  upload.single('photo'),
  controller.uploadTeamPhoto
);

// Delete Team
router.delete('/:id', isAuthenticated, controller.deleteTeam);

module.exports = router;