const express = require('express');
const router = express.Router();

const controller = require('../controllers/bonuses.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');

router.get('/', controller.getBonuses);
router.get('/:id', controller.getBonusById);

router.post('/', isAuthenticated, controller.createBonus);
router.put('/:id', isAuthenticated, controller.updateBonus);
router.delete('/:id', isAuthenticated, controller.deleteBonus);

module.exports = router;