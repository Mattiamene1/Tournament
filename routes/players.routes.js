const express = require('express');
const multer = require('multer');

const router = express.Router();
const controller = require('../controllers/players.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');

const upload = multer({ dest: 'uploads/' });

router.post(
  '/',
  isAuthenticated,
  upload.single('photo'),
  controller.createPlayer
);

router.get('/', controller.getPlayers);
router.get('/:id', controller.getPlayerById);
router.put('/:id', isAuthenticated, controller.updatePlayer);
router.delete('/:id', isAuthenticated, controller.deletePlayer);

module.exports = router;