const express = require('express');
const router = express.Router();
const controller = require('../controllers/chiosco_beers.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');

router.post('/', isAuthenticated, controller.createBeerEvent);
router.get('/standings', controller.getChioscoStandings);
router.get('/', controller.getBeerEvents);
router.delete('/:id', isAuthenticated, controller.deleteBeerEvent);

module.exports = router;