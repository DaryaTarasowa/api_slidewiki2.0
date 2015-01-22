// Get the packages we need
var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var ejs = require('ejs');
var mysql = require('mysql');
var connection = require('./config').connection; //mysql connection
var passport = require('passport');

var authController = require('./controllers/auth');
var deckController = require('./controllers/deck');
var slideController = require('./controllers/slide');
var userController = require('./controllers/user');
var scriptsController = require('./controllers/scripts');


		
function start(){

	// Create Express application
	var app = express();
        
        // Set view engine to ejs
        app.set('view engine', 'ejs');

	
	// Use bodyParser
	app.use(bodyParser.urlencoded({
		extended: true
	}));
        
        // Use express session support since OAuth2orize requires it
        app.use(session({
          secret: 'Super Secret Session Key',
          saveUninitialized: true,
          resave: true
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
        
        /////////////Scripts for changing from SlideWiki1.0/////////////////////
        router.route('/scripts/setAllTitles')
                .get(scriptsController.setAllTitles);
      
        
       // Register all our routes with /api
	app.use('/api', router);

	// Start the server
	app.listen(port);
	
}

exports.start = start;
