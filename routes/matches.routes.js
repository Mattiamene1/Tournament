const express = require('express');
const router = express.Router();
const controller = require('../controllers/matches.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');


/* CREATE */
router.post('/', isAuthenticated, controller.createMatch);

/* GET ALL (with filters) */
router.get('/', controller.getMatches);

/* GET BY ID */
router.get('/:id', controller.getMatchById);

/* UPDATE */
router.put('/:id', isAuthenticated, controller.updateMatch);

/* DELETE */
router.delete('/:id', isAuthenticated, controller.deleteMatch);

/* Additional Routes */
router.post('/:id/start', isAuthenticated, controller.startMatch);
router.post('/:id/finish', isAuthenticated, controller.finishMatch);

module.exports = router;