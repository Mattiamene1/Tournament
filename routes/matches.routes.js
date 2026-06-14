const express = require('express');
const router = express.Router();
const controller = require('../controllers/matches.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');


/* CREATE */
router.post('/', isAuthenticated, controller.createMatch);

/* GET ALL (with filters) */
router.get('/', controller.getMatches);

/* ============================================================
   FASE FINALE — TABELLONE  (admin)
   IMPORTANTE: definite PRIMA delle rotte con /:id, altrimenti
   "finals" verrebbe interpretato come un id.
============================================================ */
router.post('/finals/quarters',    isAuthenticated, controller.generateQuarterfinals);
router.post('/finals/semifinals',  isAuthenticated, controller.generateSemifinals);
router.post('/finals/finals',      isAuthenticated, controller.generateFinals);
router.delete('/finals',           isAuthenticated, controller.resetKnockout);

/* Elenco campi da gioco (pubblico: serve per mostrare/scegliere il campo) */
router.get('/meta/pitches', controller.getPitches);

/* GET BY ID */
router.get('/:id', controller.getMatchById);

/* UPDATE */
router.put('/:id', isAuthenticated, controller.updateMatch);

/* DELETE */
router.delete('/:id', isAuthenticated, controller.deleteMatch);

/* Additional Routes */
router.post('/:id/start', isAuthenticated, controller.startMatch);
router.post('/:id/end-first-half', isAuthenticated, controller.endFirstHalf);
router.post('/:id/start-second-half', isAuthenticated, controller.startSecondHalf);
router.post('/:id/finish', isAuthenticated, controller.finishMatch);
router.post('/:id/resolve-extratime', isAuthenticated, controller.resolveExtraTime);

/* Shootout (tiro per tiro) */
router.post('/:id/shootout', isAuthenticated, controller.updateShootoutScore);
router.post('/:id/shootout-kick', isAuthenticated, controller.addShootoutKick);
router.delete('/:id/shootout-kick/:eventId', isAuthenticated, controller.removeShootoutKick);
router.post('/:id/finish-shootout', isAuthenticated, controller.finishShootout);

module.exports = router;