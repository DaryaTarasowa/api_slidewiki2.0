// Get the packages we need
var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var passport = require('passport');
var authController = require('./controllers/auth');
var deckController = require('./controllers/deck');
var slideController = require('./controllers/slide');
var userController = require('./controllers/user');
var connection = require('./config').connection;
var clientController = require('./controllers/client');
var mongoose = require('mongoose');


		
function start(){

	// Create Express application
	var app = express();
	
	// Use bodyParser
	app.use(bodyParser.urlencoded({
		extended: true
	}));
        
        app.use(passport.initialize());
	
	var port = require('./config').port;
	
        //mysql connection
	connection.connect(function(err) {
		if (err) {
			console.error('error connecting: ' + err.stack);
			return;
		}

		console.log('connected as id ' + connection.threadId);
	});
        
        //mongodb connection
        //mongoose.connect('mongodb://localhost:27017/slidewiki');

        
        

	// Create Express router
	var router = express.Router();

	
		
	router.route('/deck/tree/:rev_id')
                .get(deckController.getTree);
        
        router.route('/deck/:rev_id')
                .get(deckController.getMetadata);
        
        router.route('/slide/:rev_id')
                .get(slideController.getMetadata);
        
        router.route('/user/:id')
                .get(userController.getMetadata);
        
        router.route('/user/login/:username/:pass')
                .get(userController.verifyPassword);
        
        router.get('/scripts/slide/setAllTitles', function(req, res) {
            
            slide.setAllTitles(function(response) {res.json(response);});		
	});
        
        router.route('/content/contributors/deck/:rev_id')
                .get(deckController.getContributors);
        
        router.route('/content/contributors/slide/:rev_id')
                .get(slideController.getContributors);
        
        router.route('/content/tags/deck/:rev_id')
                .get(deckController.getTags);
        
        router.route('/content/tags/slide/:rev_id')
                .get(slideController.getTags);
        
        router.route('/deck/slides/:rev_id/offset/:offset/limit/:limit/:onlyIDs')
                .get(deckController.getSlides);
        
        router.route('/clients')
            .get(authController.isAuthenticated, clientController.getClients)
            .post(authController.isAuthenticated, clientController.postClients);
            //.get(authController.isAuthenticated, clientController.getClients);
            
           
        // Register all our routes with /api
	app.use('/api', router);

	// Start the server
	app.listen(port);
	
}

exports.start = start;
