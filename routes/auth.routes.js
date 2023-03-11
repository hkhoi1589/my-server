const router = require('express').Router(); //route
const authCtrl = require('../controllers/auth.controller');

// register
router.post('/register', authCtrl.register);

// find email
router.post('/find-email', authCtrl.findEmail);

// login
router.post('/login', authCtrl.login);

// refresh token
router.post('/refresh-token', authCtrl.generateAccessToken);

module.exports = router;
