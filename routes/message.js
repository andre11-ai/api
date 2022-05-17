'use strict'

var express = require('express'); 
var MessaggeController = require('../controllers/message'); 
var api = express.Router(); 
var md_auth = require('../middlewares/authenticated'); 

api.get('/probando-md', md_auth.ensureAuth, MessaggeController.probando);
api.post('/message', md_auth.ensureAuth, MessaggeController.saveMessage);
api.get('/my-messages/:page?', md_auth.ensureAuth, MessaggeController.getReceivedMessages);
api.get('/messages/:page?', md_auth.ensureAuth, MessaggeController.getEmitMessages);
api.get('/unviewed-messages', md_auth.ensureAuth, MessaggeController.getUnviewedMessages);
api.get('/set-viewed-messages', md_auth.ensureAuth, MessaggeController.setViewedMessages);

module.exports = api;