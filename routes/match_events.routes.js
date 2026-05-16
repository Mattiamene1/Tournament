const express = require('express');
const router = express.Router();
const controller = require('../controllers/match_events.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');

router.post('/', isAuthenticated, controller.createMatchEvent);
router.get('/', controller.getMatchEvents);
router.get('/:id', controller.getMatchEventById);
router.put('/:id', isAuthenticated, controller.updateMatchEvent);
router.delete('/:id', isAuthenticated, controller.deleteMatchEvent);

module.exports = router;