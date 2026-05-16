const express = require('express');
const router = express.Router();
const controller = require('../controllers/players.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');

router.post('/', isAuthenticated, controller.createPlayer);
router.get('/', controller.getPlayers);
router.get('/:id', controller.getPlayerById);
router.put('/:id', isAuthenticated, controller.updatePlayer);
router.delete('/:id', isAuthenticated, controller.deletePlayer);

module.exports = router;