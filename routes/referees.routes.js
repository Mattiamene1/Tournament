const express = require('express');
const multer = require('multer');

const router = express.Router();
const controller = require('../controllers/referees.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }  // 8 MB
});

router.post('/',isAuthenticated,upload.single('photo'),controller.createReferee);
router.post('/:id/photo',isAuthenticated,upload.single('photo'),controller.uploadRefereePhoto);      // Update referee photo
router.get('/', controller.getReferees);
router.get('/:id', controller.getRefereeById);
router.put('/:id', isAuthenticated, controller.updateReferee);
router.delete('/:id', isAuthenticated, controller.deleteReferee);

module.exports = router;